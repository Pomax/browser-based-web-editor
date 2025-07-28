Array.from(document.querySelectorAll(`button.delete-project`)).forEach((e) => {
  const { projectId } = e.dataset;
  e.addEventListener(`click`, async () => {
    if (confirm(`Are you sure you want to delete this project?`)) {
      if (confirm(`No really: there is no undelete. Are you SURE?`)) {
        await fetch(`/project/delete/${projectId}`, { method: `POST` });
        location.reload();
      }
    }
  });
});
