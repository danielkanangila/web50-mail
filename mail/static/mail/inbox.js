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

function compose_email({ recipients = "", subject = "", body = "" }) {
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
  // initialize values, by default is empty
  recipientsEl.value = recipients;
  subjectEl.value = subject;
  bodyEl.value = body;

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

    const sendMail = (data) => {
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
    };

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
function Mail(emails) {
  // update read if current tab is inbox
  if (current_tab === "inbox") {
    fetch(`/emails/${emails.id}`, {
      method: "PUT",
      body: JSON.stringify({
        read: true,
      }),
    });
  }
  render("#email-view", MailCard(emails));
}

function MailCard(email) {
  const showToolbar = () =>
    current_tab === "inbox" || current_tab === "archive";

  return createComponent('<div class="mail-card"></div>', [
    ...(showToolbar() ? [MailToolbar(email)] : []),
    MailCardBody(email),
  ]);
}

function MailCardBody({ sender, recipients, subject, body, timestamp }) {
  return createComponent(`
    <div class="mail-card--body">
      <h3>${subject}</h3>
      <div class="d-flex align-items-center w-100 mt-3">
        <h5 class="mb-1 mr-2">
          ${sender}
        </h5>
        <small>${timestamp}</small>
      </div>
      <a class="text-muted" data-toggle="collapse" href="#collapseExample" role="button" aria-expanded="false" aria-controls="collapseExample">
        click for details
      </a>
      <div class="collapse" id="collapseExample">
        <div class="card card-body bg-light">
          <table class="table table-sm table-borderless">
            <tbody>
              <tr>
                <td><small>from:</small></td>
                <td><small>${sender}</small></td>
              </tr>
              <tr>
                <td><small>to:</small></td>
                <td><small>${recipients.join(" ,")}</small></td>
              </tr>
              <tr>
                <td><small>subject:</small></td>
                <td><small>${subject}</td>
              </tr>
              <tr>
                <td><small>date:</small> </td>
                <td><small>${timestamp}</small></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="mail-body mt-3">
        <p id="myP">${body}</p>
      </div>
    </div>
  `);
}

function MailToolbar(email) {
  let btnArchiveTitle = email.archived ? "unarchive" : "archive";

  const updateArchive = () => {
    fetch(`/emails/${email.id}`, {
      method: "PUT",
      body: JSON.stringify({
        archived: !email.archived,
      }),
    });
    load_mailbox("inbox");
    window.location.reload();
  };

  const reply = () => {
    let { sender, recipients, subject, body, timestamp } = email;
    recipients = sender;
    subject = subject.includes("RE") ? subject : `RE: ${subject}`;
    body = `On ${timestamp} ${sender}  wrote: ${body}`;

    compose_email({ recipients, subject, body });
  };

  const component = createComponent(`
    <div class="btn-group mb-3" role="group">
      <button id="btnArchive" type="button" class="btn btn-sm btn-outline-primary" data-toggle="tooltip" data-placement="bottom" title="${btnArchiveTitle}">
        <span class="material-icons icons">
          ${btnArchiveTitle}
        </span>
      </button>
      <button id="btnReply" type="button" class="btn btn-sm btn-outline-primary" data-toggle="tooltip" data-placement="bottom" title="Reply">
        <span class="material-icons icons">reply</span>
      </button>
    </div>
  `);

  // biding event on component
  component.on("click", "#btnArchive", updateArchive);
  component.on("click", "#btnReply", reply);

  return component;
}

function MailListItem({ id, sender, subject, timestamp, read }) {
  const component = createComponent(`
    <a href="javascript:void(0)" class="list-group-item list-group-item-action ${
      read ? " list-group-item-dark" : ""
    } mail-item">
      <div class="d-flex w-100 justify-content-between">
        <h5 class="mb-1">${sender}</h5>
        <small>${timestamp}</small>
      </div>
      <p class="mb-1">${subject}</p>
    </a>
  `);

  // bind click event
  component.addEventListener("click", () => view_email(id));

  return component;
}

function MailList(emails) {
  // create container for MailItem
  const MailNodesContainer = document.createElement("div");
  // add create MailItem component to the node container
  emails.map((email) => MailNodesContainer.appendChild(MailListItem(email)));
  // Mail list node
  return createComponent(
    `
    <div class="list-group">
    </div>
  `,
    [MailNodesContainer]
  );
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

  const component = createComponent(
    `
    <div>
      <h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>
    </div>
  `,
    [MailList(emails)]
  );

  return render("#emails-view", component);
}

// core function

function render(rootSelector, component) {
  const root = document.querySelector(rootSelector);
  removeAllChildNodes(root);
  root.appendChild(component);
}

function createComponent(string, components) {
  const parser = new DOMParser(),
    content = "text/html",
    DOM = parser.parseFromString(string, content);

  const rootNode = DOM.body.childNodes[0];

  rootNode.__proto__.on = function (event, selector, callback) {
    rootNode.querySelector(selector).addEventListener(event, callback);
  };

  if (components) {
    components.forEach((component) => rootNode.appendChild(component));
  }

  return rootNode;
}

// helpers functions

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

function removeErrors() {
  document.querySelectorAll(".invalid-feedback").forEach((el) => el.remove());
  document
    .querySelectorAll("input")
    .forEach((el) => el.classList.remove("is-invalid"));
  document.querySelectorAll(".alert").forEach((el) => el.remove());
}

function removeAllChildNodes(parent) {
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }
}
