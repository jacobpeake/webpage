(function () {
  const nav = [
    { label: 'Home', href: '/' },
    { label: 'Writing', href: '/writing.html' },
    { label: 'Projects', href: '/projects.html' },
  ];

  const social = [
    { label: 'GitHub', href: 'https://github.com/jepeake' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/jacob-peake/' },
    { label: 'X', href: 'https://x.com/jepeake_' },
  ];

  // determine active page
  const path = window.location.pathname;
  function isActive(href) {
    if (href === '/') return path === '/' || path === '/index.html';
    return path === href;
  }

  // writing sub-pages highlight Writing
  const writingPages = ['/how-to-learn.html', '/consciousness-is-unverifiable.html'];
  function isWritingSubpage() {
    return writingPages.includes(path);
  }

  // project sub-pages also highlight Projects
  const projectPages = ['/gpu-explorer.html'];
  function isProjectSubpage() {
    return projectPages.includes(path);
  }

  // build sidebar
  const sidebar = document.createElement('nav');
  sidebar.className = 'sidebar';

  const navSection = document.createElement('div');
  navSection.className = 'sidebar-section';
  navSection.innerHTML = '<div class="sidebar-label">Navigation</div>';
  nav.forEach(item => {
    const a = document.createElement('a');
    a.className = 'sidebar-link';
    a.href = item.href;
    a.textContent = item.label;
    if (isActive(item.href) || (item.href === '/writing.html' && isWritingSubpage()) || (item.href === '/projects.html' && isProjectSubpage())) {
      a.classList.add('active');
    }
    navSection.appendChild(a);
  });

  const socialSection = document.createElement('div');
  socialSection.className = 'sidebar-section';
  socialSection.innerHTML = '<div class="sidebar-label">Find me on</div>';
  social.forEach(item => {
    const a = document.createElement('a');
    a.className = 'sidebar-link';
    a.href = item.href;
    a.textContent = item.label;
    socialSection.appendChild(a);
  });

  sidebar.appendChild(navSection);
  sidebar.appendChild(socialSection);

  // wrap existing page content
  const page = document.querySelector('.page');
  const content = document.createElement('main');
  content.className = 'content';

  // only show name on home page
  if (isActive('/')) {
    const nameEl = document.createElement('div');
    nameEl.className = 'name';
    nameEl.textContent = 'Jacob Peake';
    content.appendChild(nameEl);
  }
  while (page.firstChild) {
    content.appendChild(page.firstChild);
  }

  const layout = document.createElement('div');
  layout.className = 'layout';
  layout.appendChild(sidebar);
  layout.appendChild(content);
  page.appendChild(layout);
})();
