// hook up container buttons
const stopButtons = document.querySelectorAll(`#containers button.stop`);
stopButtons.forEach((btn) => {
  btn.addEventListener(`click`, async () => {
    await fetch(`/v1/admin/container/stop/${btn.dataset.name}`, {
      method: `POST`,
    });
    location.reload();
  });
});

const rmButtons = document.querySelectorAll(`#containers button.remove`);
rmButtons.forEach((btn) => {
  btn.addEventListener(`click`, async () => {
    await fetch(
      `/v1/admin/container/remove/${btn.dataset.id}`,
      {
        method: `POST`,
      }
    );
    location.reload();
  });
});
