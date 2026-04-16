/*
  Файл index.js является точкой входа в наше приложение
  и только он должен содержать логику инициализации нашего приложения
  используя при этом импорты из других файлов

  Из index.js не допускается что то экспортировать
*/

import { enableValidation, clearValidation } from "./components/validation.js";
import { createCardElement, deleteCard, likeCard } from "./components/card.js";
import { openModalWindow, closeModalWindow, setCloseModalWindowEventListeners } from "./components/modal.js";
import { getCardList, getUserInfo, setUserInfo, setUserAvatar, addNewCard, removeCard, changeLikeCardStatus } from "./components/api.js";

// Настройки валидации
export const validationSettings = {
  formSelector: ".popup__form",
  inputSelector: ".popup__input",
  submitButtonSelector: ".popup__button",
  inactiveButtonClass: "popup__button_disabled",
  inputErrorClass: "popup__input_type_error",
  errorClass: "popup__error_visible",
};

// DOM узлы
const placesWrap = document.querySelector(".places__list");
const profileFormModalWindow = document.querySelector(".popup_type_edit");
const profileForm = profileFormModalWindow.querySelector(".popup__form");
const profileTitleInput = profileForm.querySelector(".popup__input_type_name");
const profileDescriptionInput = profileForm.querySelector(".popup__input_type_description");

const cardFormModalWindow = document.querySelector(".popup_type_new-card");
const cardForm = cardFormModalWindow.querySelector(".popup__form");
const cardNameInput = cardForm.querySelector(".popup__input_type_card-name");
const cardLinkInput = cardForm.querySelector(".popup__input_type_url");

const imageModalWindow = document.querySelector(".popup_type_image");
const imageElement = imageModalWindow.querySelector(".popup__image");
const imageCaption = imageModalWindow.querySelector(".popup__caption");

const openProfileFormButton = document.querySelector(".profile__edit-button");
const openCardFormButton = document.querySelector(".profile__add-button");

const profileTitle = document.querySelector(".profile__title");
const profileDescription = document.querySelector(".profile__description");
const profileAvatar = document.querySelector(".profile__image");

const avatarFormModalWindow = document.querySelector(".popup_type_edit-avatar");
const avatarForm = avatarFormModalWindow.querySelector(".popup__form");
const avatarInput = avatarForm.querySelector(".popup__input");

const infoPopup = document.querySelector(".popup_type_info");
const infoBlock = infoPopup.querySelector(".popup__info"); // dl
const userList = infoPopup.querySelector(".popup__list"); // ul
const logo = document.querySelector(".header__logo");

const definitionTemplate = document
  .getElementById("popup-info-definition-template")
  .content.querySelector(".popup__info-item");

const userTemplate = document
  .getElementById("popup-info-user-preview-template")
  .content.querySelector(".popup__list-item");

let currentUserId = null; //id пользователя

const getStats = (cards) => {
  const userSet = new Set();
  let totalLikes = 0;

  const userLikes = {}; // лайки по пользователям
  const popularCards = [...cards].sort((a, b) => b.likes.length - a.likes.length);

  cards.forEach((card) => {
    const userId = card.owner._id;
    const userName = card.owner.name;

    userSet.add(userId);

    const likesCount = card.likes.length;
    totalLikes += likesCount;

    if (!userLikes[userId]) {
      userLikes[userId] = {
        name: userName,
        likes: 0,
      };
    }

    userLikes[userId].likes += likesCount;
  });

  // максимум лайков
  let maxLikes = 0;
  let champion = "";

  Object.values(userLikes).forEach((user) => {
    if (user.likes > maxLikes) {
      maxLikes = user.likes;
      champion = user.name;
    }
  });

  return {
    totalUsers: userSet.size,
    totalLikes,
    maxLikes,
    champion,
    popularCards: popularCards.slice(0, 3), // топ 3
  };
};

const openStatsPopup = () => {
  getCardList()
    .then((cards) => {
      infoBlock.innerHTML = "";
      userList.innerHTML = "";

      const stats = getStats(cards);

      const createStatItem = (title, value) => {
        const element = definitionTemplate.cloneNode(true);
        element.querySelector(".popup__info-term").textContent = title;
        element.querySelector(".popup__info-description").textContent = value;
        return element;
      };

      infoBlock.append(
        createStatItem("Всего пользователей:", stats.totalUsers),
        createStatItem("Всего лайков:", stats.totalLikes),
        createStatItem("Максимально лайков от одного:", stats.maxLikes),
        createStatItem("Чемпион лайков:", stats.champion)
      );

      stats.popularCards.forEach((card) => {
        const cardElement = userTemplate.cloneNode(true);
        cardElement.textContent = card.name;
        userList.append(cardElement);
      });

      infoPopup.querySelector(".popup__title").textContent = "Статистика карточек";
      infoPopup.querySelector(".popup__text").textContent = "Популярные карточки:";

      openModalWindow(infoPopup);
    })
    .catch((err) => console.log(err));
};

const handlePreviewPicture = ({ name, link }) => {
  imageElement.src = link;
  imageElement.alt = name;
  imageCaption.textContent = name;
  openModalWindow(imageModalWindow);
};

const handleProfileFormSubmit = (evt) => {
  evt.preventDefault();
  const submitButton = evt.submitter;
  const initialText = submitButton.textContent;
  submitButton.textContent = "Сохранение...";

  setUserInfo({
    name: profileTitleInput.value,
    about: profileDescriptionInput.value,
  })
    .then((userData) => {
      profileTitle.textContent = userData.name;
      profileDescription.textContent = userData.about;
      closeModalWindow(profileFormModalWindow);
    })
    .catch((err) => {
      console.log(err);
    })
    .finally(() => {
      submitButton.textContent = initialText;
    });
};

const handleAvatarFromSubmit = (evt) => {
  evt.preventDefault();
  const submitButton = evt.submitter;
  const initialText = submitButton.textContent;
  submitButton.textContent = "Сохранение...";
  setUserAvatar({
    avatar: avatarInput.value,
  })
    .then((userData) => {
      profileAvatar.style.backgroundImage = `url(${userData.avatar})`;
      closeModalWindow(avatarFormModalWindow);
    })
    .catch((err) => {
      console.log(err);
    })
    .finally(() => {
      submitButton.textContent = initialText;
    });
};

const handleCardFormSubmit = (evt) => {
  evt.preventDefault();
  const submitButton = evt.submitter;
  const initialText = submitButton.textContent;
  submitButton.textContent = "Создание...";
  addNewCard({
    name: cardNameInput.value,
    link: cardLinkInput.value,
  })
    .then((newCard) => {
      placesWrap.prepend(
        createCardElement(
          newCard,
          {
            onPreviewPicture: handlePreviewPicture,
            onLikeIcon: handleLikeCard,
            onDeleteCard: handleDelete,
          },
          currentUserId
        )
      );

      closeModalWindow(cardFormModalWindow);
    })
    .catch((err) => {
      console.log(err);
    })
    .finally(() => {
      submitButton.textContent = initialText;
    });
};

const handleDelete = (cardId, cardElement) => {
  removeCard(cardId)
    .then(() => {
      cardElement.remove();
    })
    .catch((err) => console.log(err));
};

const handleLikeCard = (likeButton, cardId, likeCountElement) => {
  const isLiked = likeButton.classList.contains("card__like-button_is-active");
  changeLikeCardStatus(cardId, isLiked)
    .then((updatedCard) => {
      likeButton.classList.toggle("card__like-button_is-active");
      likeCountElement.textContent = updatedCard.likes.length;
    })
    .catch((err) => console.log(err));
};

// EventListeners
profileForm.addEventListener("submit", handleProfileFormSubmit);
cardForm.addEventListener("submit", handleCardFormSubmit);
avatarForm.addEventListener("submit", handleAvatarFromSubmit);

openProfileFormButton.addEventListener("click", () => {
  profileTitleInput.value = profileTitle.textContent;
  profileDescriptionInput.value = profileDescription.textContent;
  clearValidation(profileForm, validationSettings);
  openModalWindow(profileFormModalWindow);
});

profileAvatar.addEventListener("click", () => {
  avatarForm.reset();
  clearValidation(avatarForm, validationSettings);
  openModalWindow(avatarFormModalWindow);
});

openCardFormButton.addEventListener("click", () => {
  cardForm.reset();
  clearValidation(cardForm, validationSettings);
  openModalWindow(cardFormModalWindow);
});

//настраиваем обработчики закрытия попапов
const allPopups = document.querySelectorAll(".popup");
allPopups.forEach((popup) => {
  setCloseModalWindowEventListeners(popup);
});

logo.addEventListener("click", openStatsPopup);

//включение валидации
enableValidation(validationSettings); 

Promise.all([getCardList(), getUserInfo()])
  .then(([cards, userData]) => {
    currentUserId = userData._id;
    profileTitle.textContent = userData.name;
    profileDescription.textContent = userData.about;
    profileAvatar.style.backgroundImage = `url(${userData.avatar})`;
    
    cards.forEach((card) => {
      placesWrap.append(
        createCardElement(
          card,
          {
            onPreviewPicture: handlePreviewPicture,
            onLikeIcon: handleLikeCard,
            onDeleteCard: handleDelete,
          },
          currentUserId
        )
      );
    });
  })
  .catch((err) => {
    console.log(err); // В случае возникновения ошибки выводим её в консоль
  });
