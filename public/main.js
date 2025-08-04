/**
 * Hook up the "create project" button
 */
const create = document.getElementById(`create-project-form`);
const input = create.querySelector(`input`);
const button = create.querySelector(`button`);
create.querySelectorAll(`[disabled]`).forEach((e) => (e.disabled = false));
const createProject = async (evt) => {
  const projectName = input.value;
  if (confirm(`Create project "${projectName}"?`)) {
    await fetch(`/v1/projects/create/${projectName}`, { method: `POST` });
    location.reload();
  }
};
input.addEventListener(
  `keydown`,
  ({ key }) => key === `Enter` && createProject()
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
