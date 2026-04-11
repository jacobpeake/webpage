(function () {
  // create preview element if not present
  let preview = document.getElementById('preview');
  if (!preview) {
    preview = document.createElement('div');
    preview.className = 'preview';
    preview.id = 'preview';
    document.body.appendChild(preview);
  }

  const cache = {};
  let hoverTimeout;
  let currentLink = null;

  function isWikipedia(url) {
    return url.includes('wikipedia.org');
  }

  function isGitHub(url) {
    return url.includes('github.com');
  }

  function wikiTitle(url) {
    try {
      const path = new URL(url).pathname;
      const prefix = '/wiki/';
      if (!path.startsWith(prefix)) return null;
      return path.slice(prefix.length);
    } catch { return null; }
  }

  function githubPath(url) {
    const match = url.match(/github\.com\/(.+)$/);
    return match ? match[1].replace(/\/$/, '') : null;
  }

  async function fetchCached(key, fetcher) {
    if (cache[key]) return cache[key];
    const data = await fetcher();
    cache[key] = data;
    return data;
  }

  function positionPreview(link) {
    const rect = link.getBoundingClientRect();
    let top = rect.bottom + 8;
    let left = rect.left;

    if (left + 420 > window.innerWidth) {
      left = window.innerWidth - 436;
    }
    if (top + 260 > window.innerHeight) {
      top = rect.top - preview.offsetHeight - 8;
    }

    preview.style.top = top + 'px';
    preview.style.left = Math.max(8, left) + 'px';
  }

  function bindLink(link) {
    if (link._previewBound) return;
    link._previewBound = true;

    link.addEventListener('mouseenter', async () => {
      currentLink = link;
      const url = link.href;

      hoverTimeout = setTimeout(async () => {
        if (currentLink !== link) return;

        try {
          if (link.dataset.previewTitle) {
            if (link.dataset.previewImg) {
              preview.innerHTML = `<div class="preview-with-logo"><img src="${link.dataset.previewImg}" alt=""><div class="preview-text"><h3>${link.dataset.previewTitle}</h3><p>${link.dataset.previewDesc}</p></div></div>`;
            } else {
              preview.innerHTML = `<div class="preview-wiki"><h3>${link.dataset.previewTitle}</h3><p>${link.dataset.previewDesc}</p></div>`;
            }
            positionPreview(link);
            preview.classList.add('visible');
            return;
          }

          if (isWikipedia(url)) {
            const title = wikiTitle(url);
            if (!title) return;
            const data = await fetchCached('wiki:' + title, async () => {
              const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`);
              return res.json();
            });
            if (currentLink !== link) return;
            let html = '<div class="preview-wiki">';
            if (data.thumbnail) {
              html += `<img src="${data.thumbnail.source}" alt="">`;
            }
            html += `<h3>${data.title || ''}</h3>`;
            html += `<p>${data.extract || ''}</p>`;
            html += '</div>';
            preview.innerHTML = html;

          } else if (isGitHub(url)) {
            const path = githubPath(url);
            if (!path) return;
            const parts = path.split('/');
            const isRepo = parts.length >= 2;
            const apiUrl = isRepo
              ? `https://api.github.com/repos/${parts[0]}/${parts[1]}`
              : `https://api.github.com/users/${parts[0]}`;
            const data = await fetchCached('gh:' + path, async () => {
              const res = await fetch(apiUrl);
              return res.json();
            });
            if (currentLink !== link) return;

            let html = '<div class="preview-github">';
            if (isRepo) {
              html += `<h3>${data.full_name || path}</h3>`;
              html += `<p>${data.description || 'No description'}</p>`;
              html += `<div class="meta">`;
              if (data.language) html += `<span>${data.language}</span>`;
              html += `<span>${data.stargazers_count || 0} stars</span>`;
              html += `<span>${data.forks_count || 0} forks</span>`;
              html += `</div>`;
            } else {
              html = `<div class="preview-social">
                <svg class="social-icon" viewBox="0 0 24 24" fill="#333"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                <div class="social-info">
                  <h3>${data.name || data.login || path}</h3>
                  <p>${data.bio || 'github.com/' + path}</p>
                </div>
              </div>`;
            }
            html += '</div>';
            preview.innerHTML = html;

          } else if (url.includes('linkedin.com')) {
            const handle = url.match(/\/in\/([^/]+)/);
            preview.innerHTML = `<div class="preview-social">
              <svg class="social-icon" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              <div class="social-info">
                <h3>Jacob Peake</h3>
                <p>linkedin.com/in/${handle ? handle[1] : ''}</p>
              </div>
            </div>`;

          } else if (url.includes('x.com') || url.includes('twitter.com')) {
            const handle = url.match(/(?:x|twitter)\.com\/([^/]+)/);
            preview.innerHTML = `<div class="preview-social">
              <svg class="social-icon" viewBox="0 0 24 24" fill="#000"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              <div class="social-info">
                <h3>@${handle ? handle[1] : ''}</h3>
                <p>x.com/${handle ? handle[1] : ''}</p>
              </div>
            </div>`;

          } else {
            return;
          }

          positionPreview(link);
          preview.classList.add('visible');
        } catch { return; }
      }, 300);
    });

    link.addEventListener('mouseleave', () => {
      clearTimeout(hoverTimeout);
      currentLink = null;
      preview.classList.remove('visible');
      setTimeout(() => {
        if (!preview.classList.contains('visible')) {
          preview.innerHTML = '';
        }
      }, 150);
    });
  }

  function initPreviews() {
    document.querySelectorAll('.content a, .sidebar a').forEach(bindLink);
  }

  // run on load
  initPreviews();

  // expose for article.js to call after markdown renders
  window.initPreviews = initPreviews;
})();
