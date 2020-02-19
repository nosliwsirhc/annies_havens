// Side Navigation Init
const sideNav = document.querySelector(".sidenav");
M.Sidenav.init(sideNav, {});

// Dropdown
const dropdown = document.querySelectorAll(".dropdown-trigger");
M.Dropdown.init(dropdown, {
    hover: true,
    coverTrigger: false,
    inDuration: 500,
    constrainWidth: false
});

// Navigation link active
(function() {
  const nav = document.getElementsByTagName("NAV");
  const ul = nav[0].getElementsByTagName("ul");
  const lis = ul[0].getElementsByTagName("li");
  let anchors = [];
  for (let i = 0; i < lis.length; i++) {
    const navEl = lis[i].querySelector("a");
    if (navEl !== null && navEl.getAttribute("href").split("/")[1]) {
      anchors.push(lis[i]);
    }
  }
  const current = window.location.pathname.split("/")[1];
  for (let i = 0; i < anchors.length; i++) {
    if (
      anchors[i]
        .querySelector("a")
        .getAttribute("href")
        .split("./")[1] == current
    ) {
      anchors[i].classList.add("active");
    }
  }
})();
