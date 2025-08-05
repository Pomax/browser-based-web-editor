/**
 * Hook up the "create project" button
 */
const create = document.getElementById(`create-project-form`);
const input = create.querySelector(`input`);
const starter = create.querySelector(`select`);
const button = create.querySelector(`button`);

create.querySelectorAll(`[disabled]`).forEach((e) => (e.disabled = false));
const createProject = async (evt) => {
  const projectName = input.value;
  const type = starter.value || `empty`;
  if (confirm(`Create ${type} project "${projectName}"?`)) {
    await fetch(`/v1/projects/create/${projectName}/${type}`, {
      method: `POST`,
    });
    location.reload();
  }
};
input.addEventListener(
  `keydown`,
  ({ key }) => key === `Enter` && button.click()
);
button.addEventListener(`click`, createProject);

/**
 * Hook up the "delete project" buttons
 */
Array.from(document.querySelectorAll(`button.delete-project`)).forEach((e) => {
  const { projectName } = e.dataset;
  e.addEventListener(`click`, async () => {
    if (confirm(`Are you sure you want to delete this project?`)) {
      if (confirm(`No really: there is NO undelete. Are you SURE?`)) {
        await fetch(`/v1/projects/delete/${projectName}`, { method: `POST` });
        location.reload();
      }
    }
  });
});
