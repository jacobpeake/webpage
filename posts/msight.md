I have been experimenting more with running local models on ***[Apple Silicon](https://en.wikipedia.org/wiki/Apple_silicon)***. I was curious about what the hardware is actually doing when these workloads run: which cores are active, at what frequency, how much power is being drawn, and where memory bandwidth is going.

macOS has `powermetrics`, which dumps this data to stdout, but it is not designed for interactive use. Tools like ***[asitop](https://github.com/tlkh/asitop)*** and ***[mactop](https://github.com/context-labs/mactop)*** exist, but I wanted something I could tailor to the metrics I care about most (and make pretty). mSight is the result: a terminal-based performance monitor for Apple Silicon, written in ***[Rust](https://www.rust-lang.org/)***.

---

### What Apple Silicon Exposes

Apple Silicon has a heterogeneous architecture. A single chip contains ***efficiency cores*** (E-cores), ***performance cores*** (P-cores), a GPU, and an ***Apple Neural Engine*** (ANE), all sharing a ***unified memory*** architecture.

Each of these has its own power domain and frequency, dynamically adjusted based on thermal and power constraints.

`powermetrics` exposes this per-domain telemetry: core residency (what percentage of time a cluster is active), current frequency, and power draw in milliwatts. It also reports GPU active residency, ANE power, network I/O, and disk I/O. This is the data I wanted to visualise.

---

### Architecture

mSight is a single Rust binary (~1400 lines) that spawns `powermetrics` as a subprocess and parses its streaming output line by line using compiled regex patterns.

The tool runs three threads:

1. ***Metrics thread***: reads `powermetrics` stdout, parses CPU/GPU/ANE/power/network/disk metrics, and publishes them over a channel
2. ***Process thread***: samples per-process CPU & memory usage every 2 seconds via `libproc`, computes CPU% by diffing two `TaskInfo` snapshots 500ms apart
3. ***Main thread***: runs the event loop, receives metrics from both channels, and renders the TUI

Memory statistics come from a direct Mach kernel call (`host_statistics64`) rather than from `powermetrics`, giving access to active, wired, and compressed page counts.

---

### The Interface

The terminal UI is built with ***[tui-rs](https://github.com/fdehau/tui-rs)*** and ***[crossterm](https://github.com/crossterm-rs/crossterm)***. It shows:

***Top section***: four panels for E-cores, P-cores, GPU, and ANE, each with a live utilisation chart and current frequency.

***Middle section***: memory utilisation (with swap) and power draw for the package, CPU, and GPU individually, with rolling 120-second history graphs.

***Bottom section***: a sortable, scrollable process table showing PID, name, CPU%, memory, thread count, and user. Sorting by any column with arrow keys and `s`.

The UI refreshes every 500ms. Metrics arrive every second from `powermetrics`. Keyboard input is processed immediately.

---

### Why Rust

Rust was a deliberate choice. A performance monitor needs to be lightweight. It should not itself become a visible entry in the process list. Rust compiles to a native binary with no runtime, no garbage collector, and minimal overhead. The concurrency model (channels via `crossbeam`, shared state via `Arc<Mutex<>>`) maps cleanly onto the multi-threaded collection architecture.

The entire tool is a single file. It is simple to read, modify, and extend.

---

### What I Use It For

When running local models, I want to see P-core vs E-core utilisation, GPU utilisation, memory bandwidth usage, and power draw all at once. When inference is slower than expected, the first question is whether it is compute-bound or memory-bound, and whether the system is thermally throttling. mSight puts all of this in one terminal pane.

It is available via Homebrew: `brew tap jepeake/mtop && brew install mtop`.
