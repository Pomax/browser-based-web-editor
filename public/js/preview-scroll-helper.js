// FIXME: TODO: doing this right *way* more effort than
//              is currently warranted, so this is a hack.
if (window.parent) {
  const maintainScroll = localStorage.getItem(`preview:scroll`);

  if (maintainScroll) {
    const [x, y] = maintainScroll.split(`:`).map(parseFloat);
    window.scrollTo(x, y * document.body.scrollHeight);
  }

  let scrollLock = false;
  window.addEventListener(
    `scroll`,
    () => {
      if (scrollLock) {
        clearTimeout(scrollLock);
      }
      scrollLock = setTimeout(() => {
        const x = scrollX;
        const y = scrollY / document.body.scrollHeight;
        console.log(x, y);
        localStorage.setItem(`preview:scroll`, `${x}:${y}`);
        scrollLock = false;
      }, 100);
    },
    { passive: true }
  );
}
