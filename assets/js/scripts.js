document.addEventListener("DOMContentLoaded", () => {
  // Copyright Date
  const copyright = document.getElementById("copyright");
  if (copyright) {
    copyright.innerHTML = new Date().getFullYear();
  }

  if (window.M) {
    // Side Navigation Init
    const sideNav = document.querySelector(".sidenav");
    if (sideNav) {
      window.M.Sidenav.init(sideNav, {});
    }

    // Dropdown
    const dropdowns = document.querySelectorAll(".dropdown-trigger");
    window.M.Dropdown.init(dropdowns, {
      hover: true,
      coverTrigger: false,
      inDuration: 500,
      constrainWidth: false
    });
  }

  // Navigation link active
  const navLinks = document.querySelectorAll("nav .my-nav-links li a[href]");
  if (navLinks.length) {
    const currentPath = window.location.pathname;
    navLinks.forEach((link) => {
      const href = link.getAttribute("href");
      if (!href) return;
      const isHome = href === "/" && currentPath === "/";
      const isMatch = href !== "/" && currentPath.startsWith(href);
      if (isHome || isMatch) {
        link.parentElement?.classList.add("active");
      }
    });
  }
});
