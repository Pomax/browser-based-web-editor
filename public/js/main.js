/**
 * Hook up the "create project" button
 */
const create = document.getElementById(`create-project-form`);
const starter = create.querySelector(`select`);
const button = create.querySelector(`button`);

if (starter && button) {
  create.querySelectorAll(`[disabled]`).forEach((e) => (e.disabled = false));
  const createProject = async (evt) => {
    const starterName = starter.value || `empty`;
    if (confirm(`Create new ${starterName} project ?`)) {
      const url = await fetch(`/v1/projects/remix/${starterName}`).then((r) =>
        r.text()
      );
      console.log(`got url ${url}`);
      location = url;
    }
  };
  button.addEventListener(`click`, createProject);

  /**
   * Hook up the "delete project" buttons
   */
  Array.from(document.querySelectorAll(`button.delete-project`)).forEach(
    (e) => {
      const { projectName } = e.dataset;
      e.addEventListener(`click`, async () => {
        if (confirm(`Are you sure you want to delete "${projectName}"?`)) {
          if (confirm(`No really: there is NO undelete. ARE YOU SURE?`)) {
            await fetch(`/v1/projects/delete/${projectName}`, {
              method: `POST`,
            });
            location.reload();
          }
        }
      });
    }
  );

  /**
   * Hook up the "edit project" buttons
   */
  Array.from(document.querySelectorAll(`button.edit-project`)).forEach((e) => {
    const { projectId } = e.dataset;
    e.addEventListener(`click`, async () => {
      showEditDialog(projectId);
    });
  });
}
