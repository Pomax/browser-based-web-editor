/**
 * Hook up the "create project" button
 */
const create = document.getElementById(`create-project-form`);
const input = document.querySelector(`input`);
const starter = document.querySelector(`select`);
const button = document.querySelector(`button`);

if (input && starter && button) {
  document.querySelectorAll(`[disabled]`).forEach((e) => (e.disabled = false));
  const createProject = async (evt) => {
    const projectName = input.value;
    const type = starter.value || `empty`;
    if (confirm(`Create ${type} project "${projectName}"?`)) {
      await fetch(`/v1/projects/create/${type}/${projectName}`, {
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

const signup = document.querySelector(`button.signup`);
if (signup) {
  signup.addEventListener(`click`, () => {
    // run the login route
  });
}
