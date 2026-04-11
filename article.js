(function () {
  // preview data keyed by URL — keeps Markdown clean
  const previewData = {
    'https://en.wikipedia.org/wiki/Ren%C3%A9_Descartes': {
      title: 'René Descartes',
      desc: '\u201cAnd yet what do I see from the window but hats and coats which may cover automatic machines? Yet I judge these to be men.\u201d \u2014 Meditations on First Philosophy (1641), Second Meditation.'
    },
    'https://godbolt.org/': {
      title: 'Compiler Explorer',
      desc: 'Interactive tool that lets you type source code and see the assembly output of various compilers in real time. Created by Matt Godbolt.'
    },
    'https://docs.nvidia.com/cuda/parallel-thread-execution/': {
      title: 'PTX ISA',
      desc: 'Parallel Thread Execution — NVIDIA\u2019s virtual instruction set architecture. A stable, portable intermediate representation for GPU programs, independent of specific hardware.'
    },
    'https://docs.nvidia.com/cuda/cuda-binary-utilities/': {
      title: 'CUDA Binary Utilities',
      desc: 'Tools for inspecting CUDA binaries. cuobjdump and nvdisasm extract SASS — the native machine code that executes on a specific NVIDIA GPU architecture.'
    },
    'https://triton-lang.org/': {
      title: 'Triton',
      desc: 'A Python-based language and compiler for writing GPU kernels. Developed at OpenAI. Programs are JIT-compiled to PTX/LLVM IR through a custom compiler stack.'
    },
    'https://hazyresearch.stanford.edu/blog/2024-05-12-tk': {
      title: 'ThunderKittens',
      desc: 'A framework for writing high-performance GPU kernels in C++20, from Stanford\u2019s Hazy Research. Uses architecture-specific intrinsics for Hopper and Blackwell GPUs.'
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
        }
      });

      // re-init preview.js on new links
      if (window.initPreviews) window.initPreviews();
    });
})();
