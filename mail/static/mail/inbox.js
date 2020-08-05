let current_tab = null;
document.addEventListener("DOMContentLoaded", function () {
  // Use buttons to toggle between views
  document
    .querySelector("#inbox")
    .addEventListener("click", () => load_mailbox("inbox"));
  document
    .querySelector("#sent")
    .addEventListener("click", () => load_mailbox("sent"));
  document
    .querySelector("#archived")
    .addEventListener("click", () => load_mailbox("archive"));
  document.querySelector("#compose").addEventListener("click", compose_email);

  // By default, load the inbox
  load_mailbox("inbox");
});

function compose_email() {
  // update current_tab
  current_tab = "compose";
  // Show compose view and hide other views
  document.querySelector("#emails-view").style.display = "none";
  document.querySelector("#email-view").style.display = "none";
  document.querySelector("#compose-view").style.display = "block";

  // form fields
  const recipientsEl = document.querySelector("#compose-recipients");
  const subjectEl = document.querySelector("#compose-subject");
  const bodyEl = document.querySelector("#compose-body");
  // Clear out composition fields
  recipientsEl.value = "";
  subjectEl.value = "";
  bodyEl.value = "";

  // handle form submit
  document.querySelector("#compose-form").addEventListener("submit", (e) => {
    e.preventDefault();
    removeErrors();
    // form data serialization
    const data = {
      recipients: recipientsEl.value,
      subject: subjectEl.value,
      body: bodyEl.value,
    };
    // validation
    const errors = validate(data);

    if (errors.length) return showFormErrors(errors);

    // sendMail data if form is valid
    sendMail(data);
  });
}

function load_mailbox(mailbox) {
  // update current_tab
  current_tab = mailbox;
  // Show the mailbox and hide other views
  document.querySelector("#emails-view").style.display = "block";
  document.querySelector("#email-view").style.display = "none";
  document.querySelector("#compose-view").style.display = "none";

  // Show the mailbox name
  document.querySelector("#emails-view").innerHTML = `<h3>${
    mailbox.charAt(0).toUpperCase() + mailbox.slice(1)
  }</h3>`;

  fetch(`/emails/${mailbox}`)
    .then((response) => response.json())
    .then((emails) => {
      if (!emails) return;
      Mailbox(emails, mailbox);
    });
}

function view_email(mail_id) {
  // Show the email and hide other views
  document.querySelector("#email-view").style.display = "block";
  document.querySelector("#emails-view").style.display = "none";
  document.querySelector("#compose-view").style.display = "none";

  fetch(`/emails/${mail_id}`)
    .then((response) => response.json())
    .then((result) => {
      if (result) Mail(result);
    });
}

// components
function Mail({ id, sender, recipients, subject, body, timestamp }) {
  // update read if current tab is inbox
  if (current_tab === "inbox") {
    fetch(`/emails/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        read: true,
      }),
    });
  }
}

function MailListItem({ id, sender, subject, timestamp, read }) {
  return createComponent(`
    <a href="javascript:void(0)" onclick="view_email(${id})" class="list-group-item list-group-item-action ${
    read ? " list-group-item-dark" : ""
  } mail-item">
      <div class="d-flex w-100 justify-content-between">
        <h5 class="mb-1">${sender}</h5>
        <small>${timestamp}</small>
      </div>
      <p class="mb-1">${subject}</p>
    </a>
  `);
}

function MailList(emails) {
  return createComponent(`
    <div class="list-group">
      ${emails.map((email) => MailListItem(email).outerHTML).join("")}
    </div>
  `);
}

function Mailbox(emails, mailbox) {
  if (mailbox === "sent") {
    // By default MailListItem component show only a sender,
    // change the value of all sender properties to recipients if is in sent box
    emails = emails.map((email) => {
      return {
        ...email,
        sender: `To: ${email.recipients[0]} ${
          email.recipients.length > 1 ? " and Others..." : ""
        }`,
      };
    });
  }
  return renderMailbox(MailList(emails));
}

// helpers function

function sendMail(data) {
  fetch("/emails", {
    method: "POST",
    body: JSON.stringify(data),
  })
    .then((response) => response.json())
    .then((result) => {
      // if error, show error
      if (result.error) return showAlertError(result.error);
      // else go to the sent tab.
      load_mailbox("sent");
    });
}

function renderMailbox(component) {
  const root = document.querySelector("#emails-view");
  root.appendChild(component);
}

function showAlertError(message) {
  const errorEl = document.createElement("div");
  const messageNode = document.createTextNode(message);

  errorEl.classList.add("alert", "alert-danger");
  errorEl.appendChild(messageNode);
  document.querySelector("form").prepend(errorEl);
}

function addErrorToField(el, message) {
  const parentEl = el.parentElement;
  const errorEl = document.createElement("div");
  const messageNode = document.createTextNode(message);

  errorEl.classList.add("invalid-feedback");
  el.classList.add("is-invalid");

  errorEl.appendChild(messageNode);
  parentEl.appendChild(errorEl);
}

function validate(data) {
  // remove all error div in the dom and invalid class on inputs
  document.querySelectorAll(".invalid-feedback").forEach((el) => el.remove());
  document
    .querySelectorAll("input")
    .forEach((el) => el.classList.remove("is-invalid"));
  // start validation
  const errors = [];

  if (!data.recipients)
    errors.push({
      element: document.querySelector("#compose-recipients"),
      message: "Recipient(s) is/are required.",
    });
  if (!data.subject)
    errors.push({
      element: document.querySelector("#compose-subject"),
      message: "Subject are required.",
    });

  return errors;
}

function showFormErrors(errors) {
  errors.forEach(({ element, message }) => addErrorToField(element, message));
}

function createComponent(string) {
  const parser = new DOMParser(),
    content = "text/html",
    DOM = parser.parseFromString(string, content);

  return DOM.body.childNodes[0];
}

function removeErrors() {
  document.querySelectorAll(".invalid-feedback").forEach((el) => el.remove());
  document
    .querySelectorAll("input")
    .forEach((el) => el.classList.remove("is-invalid"));
  document.querySelectorAll(".alert").forEach((el) => el.remove());
}
