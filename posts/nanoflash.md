***[Flash Attention](https://arxiv.org/abs/2205.14135)*** is an important algorithmic rewrite of the attention operation. It is what allows transformers to scale to long sequence lengths. The idea is simple, but the implementations that exist can be complex, heavily optimised, and hard to parse.

I wanted to write the ***smallest possible implementation*** of Flash Attention in CUDA that is still correct and complete. nanoFlash is the result: the entire forward pass in ~30 lines of kernel code.

---

### The Problem

In a transformer, each token in a sequence of length $N$ produces three vectors of dimension $d$,<br> a query (what this token wants to know), a key (what this token can be asked about), and a value (what this token actually says). Stacking these across all tokens gives three matrices: $Q$, $K$, $V$, each $N \times d$. Attention computes $\text{softmax}\left(\frac{QK^\top}{\sqrt{d}}\right) \cdot V$, which lets each token attend to every other token, weighted by the similarity of their queries and keys. The output $O$ is $N \times d$, the same shape as the inputs. The naive way to do this materialises the full $N \times N$ attention matrix $S = QK^\top$ in GPU global memory. You need the entire matrix before you can apply softmax (which operates row-wise and needs the row max for numerical stability), and then multiply by $V$. Memory is therefore $O(N^2)$ in sequence length. For long sequences this is prohibitive, and the repeated reads & writes to global memory dominate runtime.

Flash Attention avoids this by ***never materialising the full attention matrix***. Instead, it tiles the computation through shared memory (SRAM), processing small tiles of Q, K, and V at a time, and accumulating the output incrementally.

---

### Online Softmax

The trick that makes this possible is ***[online softmax](https://arxiv.org/abs/1805.02867)***. Standard softmax over a row of logits $x_i$ is:

$$\text{softmax}(x_i) = \frac{e^{x_i - \max(x)}}{\sum_j e^{x_j - \max(x)}}$$

This requires two passes: one to find $\max(x)$ (for numerical stability), one to exponentiate & sum. You need all the logits in memory at once.

Online softmax replaces this with a ***single-pass recurrence***. It maintains a running max $m$ and a running sum $l$, updated as each new element $x_i$ arrives:

$$m_i = \max(m_{i-1},\; x_i) \qquad l_i = e^{m_{i-1} - m_i} \cdot l_{i-1} + e^{x_i - m_i}$$

When a new element produces a larger max, the $e^{m_{i-1} - m_i}$ term rescales the previously accumulated sum. After all elements are processed, $l_n$ is the correct softmax denominator. No second pass needed.

In Flash Attention, this recurrence operates on ***tiles*** rather than individual elements, which is what allows it to stream through K/V without ever needing all the logits in memory at once.

---

### Tiling

The $N \times N$ attention matrix $S = QK^\top$ is too large to materialise, but it can be computed in ***tiles***. Q is divided into $T_r$ tiles of $B_r$ rows each. K and V are divided into $T_c$ tiles of $B_c$ rows each. One tile of Q and one tile of K together produce a $B_r \times B_c$ sub-tile of the attention matrix, which fits in SRAM.

The ***outer loop*** iterates over tiles of K and V ($j = 1 \ldots T_c$), loading one tile at a time from HBM into SRAM. The ***inner loop*** iterates over tiles of Q ($i = 1 \ldots T_r$), loading each into SRAM against the current K/V tile. Each (Q, K, V) tile triple computes a sub-tile of attention on-chip, and the output is accumulated back to HBM.

The diagram below (from the [original paper](https://arxiv.org/abs/2205.14135)) shows this data flow.
![Flash Attention tiling, from Dao et al.](/diagrams/flash-attn.png)

For each pair of tiles:

1. Load tile $K_j$ and $V_j$ into SRAM
2. For each Q tile, compute local attention scores $S_{ij} = Q_i \cdot K_j^\top / \sqrt{d}$
3. Run online softmax on $S_{ij}$ (update running max & sum)
4. Accumulate the weighted output $O_i \mathrel{+}= \text{softmax}(S_{ij}) \cdot V_j$, rescaled by the running statistics

K and V are loaded once per outer iteration and reused across all Q tiles. This is where the memory savings come from: instead of reading K and V $N$ times, you read them $N/B_c$ times.

The tile size itself is determined by how much SRAM the GPU has. nanoFlash computes this dynamically:

$$B_c = \left\lfloor \frac{\text{SRAM}}{4d} \right\rfloor$$

Three tiles (Q, K, V) of size $B_c \times d$ plus the score matrix $B_c \times B_c$ need to fit simultaneously.

---

### The Kernel

The entire implementation is one file, `cuda.cu`. The kernel is ~30 lines. Here is what each part does.

***Setup.*** The kernel receives dynamically allocated shared memory and partitions it into four regions: `Qi`, `Kj`, `Vj` (the three tile buffers) and `S` (the score matrix). Each thread handles one row of a tile. The grid is `(batch_size, num_heads)`, so each block processes one (batch, head) pair independently.

***Loading K/V.*** The outer loop iterates over column tiles. Each thread loads one row of K and one row of V from global memory into shared memory. A `__syncthreads()` ensures the entire tile is loaded before any thread starts computing with it.

***Computing Scores.*** The inner loop iterates over Q row tiles. Each thread loads its row of Q, then computes the dot product of that row against every row of the K tile: $S_{tx,y} = \frac{1}{\sqrt{d}} \sum_x Q_i[tx, x] \cdot K_j[y, x]$. It tracks the row maximum as it goes.

***Online Softmax.*** Two lines do the softmax. First, shift each logit by the row max and exponentiate: $S_{tx,y} = e^{S_{tx,y} - m_{\text{row}}}$, accumulating the row sum. Then merge with the running statistics from previous tiles:

$$m_i' = \max(m_i,\; m_{\text{row}}) \qquad l_i' = e^{m_i - m_i'} \cdot l_i + e^{m_{\text{row}} - m_i'} \cdot l_{\text{row}}$$

$m_i$ and $l_i$ are the running max and sum across all column tiles seen so far. The $e^{m_i - m_i'}$ terms rescale the old statistics when a new tile produces a larger maximum. This is the core of the numerical stability guarantee.

***Output Accumulation.*** This is the most subtle line. For each output element, the kernel computes $pv = \sum_y S_{tx,y} \cdot V_j[y]$ (the attention-weighted value for this tile), then updates the output:

$$O_{tx} = \frac{1}{l_i'} \left( e^{m_i - m_i'} \cdot l_i \cdot O_{tx} + e^{m_{\text{row}} - m_i'} \cdot pv \right)$$

The old output is ***rescaled*** by how much the running max changed, and the new contribution is added with its own scaling. After all column tiles are processed, the running statistics converge to the true softmax denominator, and the output is exact.

***Launch.*** The `forward()` function queries the GPU's shared memory capacity, computes tile sizes ($B_c = \lfloor \text{sram} / (4d) \rfloor$), allocates the running statistics ($l$ initialised to 0, $m$ to $-\infty$), and launches the kernel.

There is no backward pass, no mixed precision, no causal masking, no multi-GPU support.

Just the core algorithm, as clearly as I could write it.

