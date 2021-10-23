const videoContainer = document.getElementById("videoContainer");
const form = document.getElementById("commentForm");
let removeIcon = document.querySelectorAll(".fa-trash-alt");

const addComment = (text, id) => {
  const commentList = document.querySelector(".video__comments ul");
  const newComment = document.createElement("li");
  newComment.dataset.id = id;
  newComment.className = "video__comment";
  const icon = document.createElement("i");
  icon.className = "fas fa-comment";
  const span = document.createElement("span");
  const deleteIcon = document.createElement("i");
  deleteIcon.className = "fas fa-trash-alt";
  deleteIcon.addEventListener("click", handleDelete);
  span.innerText = ` ${text}`;
  newComment.appendChild(icon);
  newComment.appendChild(span);
  newComment.appendChild(deleteIcon);
  commentList.prepend(newComment);
};

const deleteComment = (id) => {
  const comment = document.querySelector(`li[data-id='${id}']`);
  comment.remove();
};

const handleSubmit = async (event) => {
  event.preventDefault();
  const textarea = form.querySelector("textarea");
  const text = textarea.value;
  const videoId = videoContainer.dataset.id;
  if (text === "") {
    return;
  }
  const response = await fetch(`/api/videos/${videoId}/comment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (response.status === 201) {
    textarea.value = "";
    const { newCommentId } = await response.json();
    addComment(text, newCommentId);
  }
};

const handleDelete = async (event) => {
  alert("Are you sure want to delete comment?");
  console.log(event);
  const commentId = event.path[2].dataset.id;

  const videoId = videoContainer.dataset.id;
  const response = await fetch(`/api/videos/${videoId}/comment/delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ commentId }),
  });
  if (response.status === 201) {
    deleteComment(commentId);
  }
};
if (form) {
  form.addEventListener("submit", handleSubmit);
}
removeIcon.forEach(function (element) {
  element.addEventListener("click", handleDelete);
});
