(function () {
  // preview data keyed by URL — keeps Markdown clean
  const previewData = {
    'https://en.wikipedia.org/wiki/Ren%C3%A9_Descartes': {
      title: 'René Descartes',
      desc: '\u201cAnd yet what do I see from the window but hats and coats which may cover automatic machines? Yet I judge these to be men.\u201d \u2014 Meditations on First Philosophy (1641), Second Meditation.'
    },
    'https://docs.nvidia.com/cuda/cuda-c-programming-guide/': {
      title: 'CUDA',
      desc: 'NVIDIA\u2019s parallel computing platform and programming model. Extends C++ with kernel launch syntax.',
      img: 'https://avatars.githubusercontent.com/u/1728152?v=4'
    },
    'https://godbolt.org/': {
      title: 'Compiler Explorer',
      desc: 'Interactive tool that lets you type source code and see the assembly output of various compilers in real time.',
      img: 'https://avatars.githubusercontent.com/u/57653830?v=4'
    },
    'https://docs.nvidia.com/cuda/parallel-thread-execution/': {
      title: 'PTX',
      desc: 'Parallel Thread Execution. A stable, portable IR for GPU programs, independent of specific hardware.',
      img: 'https://avatars.githubusercontent.com/u/1728152?v=4'
    },
    'https://docs.nvidia.com/cuda/cuda-binary-utilities/': {
      title: 'SASS',
      desc: 'Shader Assembly. The native machine code that executes on a specific NVIDIA GPU architecture.',
      img: 'https://avatars.githubusercontent.com/u/1728152?v=4'
    },
    'https://triton-lang.org/': {
      title: 'Triton',
      desc: 'A Python-based language and compiler for writing GPU kernels. Developed at OpenAI.',
      img: 'https://cdn.openai.com/triton/assets/triton-logo.png'
    },
    'https://www.modular.com/mojo': {
      title: 'Mojo',
      desc: 'A programming language combining Python syntax with systems-level performance.',
      img: 'https://avatars.githubusercontent.com/u/39327063?v=4'
    },
    'https://github.com/tile-ai/tilelang': {
      title: 'TileLang',
      desc: 'A tile-based GPU programming DSL for writing high-performance kernels with explicit tiling and scheduling.',
      img: 'https://avatars.githubusercontent.com/u/183584698?v=4'
    },
    'https://hazyresearch.stanford.edu/blog/2024-05-12-tk': {
      title: 'ThunderKittens',
      desc: 'An embedded DSL for high-performance GPU kernels in C++20, from Stanford\u2019s Hazy Research.',
      img: 'https://raw.githubusercontent.com/hazyresearch/ThunderKittens/main/assets/thunderkittens.png'
    },
    'https://hazyresearch.stanford.edu/blog/2025-11-09-hk': {
      title: 'HipKittens',
      desc: 'ThunderKittens ported to AMD GPUs via HIP. Brings the same high-performance kernels to CDNA/RDNA.',
      img: 'https://github.com/HazyResearch/HipKittens/raw/main/assets/hipkittens.png'
    },
    'https://www.docker.com/': {
      title: 'Docker',
      desc: 'Container platform for packaging and running applications in isolated environments.',
      img: 'https://www.docker.com/wp-content/uploads/2022/03/Moby-logo.png'
    },
    'https://arxiv.org/abs/2205.14135': {
      title: 'Flash Attention',
      desc: 'Fast and memory-efficient exact attention with IO-awareness. Dao et al., 2022.'
    },
    'https://arxiv.org/abs/1805.02867': {
      title: 'Online Softmax',
      desc: 'Online normalizer calculation for softmax. Milakov & Gimelshein, 2018.'
    },
    'https://en.wikipedia.org/wiki/Apple_silicon': {
      title: 'Apple Silicon',
      desc: 'Apple\u2019s family of ARM-based SoCs. Heterogeneous architecture with efficiency cores, performance cores, GPU, and Neural Engine on a single chip.',
      img: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg'
    },
    'https://www.rust-lang.org/': {
      title: 'Rust',
      desc: 'A systems programming language focused on safety, speed, and concurrency.',
      img: 'https://www.rust-lang.org/logos/rust-logo-512x512.png'
    },
    'https://github.com/tlkh/asitop': {
      title: 'asitop',
      desc: 'A Python-based Apple Silicon performance monitor. Inspired the development of mSight.'
    },
    'https://github.com/context-labs/mactop': {
      title: 'mactop',
      desc: 'A terminal-based monitoring tool for macOS, similar to htop but with Apple Silicon metrics.'
    }
  };

  const body = document.querySelector('.article-body');
  const src = body && body.dataset.src;
  if (!body || !src) return;

  fetch(src)
    .then(r => r.text())
    .then(md => {
      body.innerHTML = marked.parse(md);

      // attach preview data to matching links
      body.querySelectorAll('a').forEach(link => {
        const data = previewData[link.href] || previewData[decodeURI(link.href)];
        if (data) {
          link.dataset.previewTitle = data.title;
          link.dataset.previewDesc = data.desc;
          if (data.img) link.dataset.previewImg = data.img;
        }
      });

      // re-init preview.js on new links
      if (window.initPreviews) window.initPreviews();

      // render LaTeX math via KaTeX if available
      if (window.katex) {
        // display math: $$...$$
        body.innerHTML = body.innerHTML.replace(/\$\$([^$]+)\$\$/g, (_, tex) => {
          try { return katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false }); }
          catch { return _; }
        });
        // inline math: $...$
        body.innerHTML = body.innerHTML.replace(/\$([^$]+)\$/g, (_, tex) => {
          try { return katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false }); }
          catch { return _; }
        });
      }
    });
})();
