let socket, nickName, lastUserMsg

const chat = document.querySelector('.chat_messages')
const authForm = document.getElementById('authForm')
const chatAside = document.querySelector('aside')
const otherUsers = document.querySelector('.side_chat_block_others_wrapper')
const chatWrapper = document.querySelector('.chat_wrapper')
const myImgBlock = document.querySelector('.side_chat_block_mine .side_chat_img')
const myNickText = document.querySelector('.side_chat_block_mine .side_chat_nick')
const messageForm = document.querySelector('.message_form')
const picturePopup = document.querySelector('.upload_pic_popup')
const pictureForm = picturePopup.querySelector('form')
const pictureInput = document.getElementById('avatar_input')
const pictureInputImg = picturePopup.querySelector('label img')
const picturePopupClose = picturePopup.querySelector('.upload_pic_close')
const pictureCancel = pictureForm.querySelector('.avatar_form_cancel')


authForm.addEventListener('submit', e => {
    e.preventDefault()
    nickName = e.target.elements.nick.value.trim()
    if(nickName === '') alert('Никнейм не должен быть пустым!')
    else{
        socket = new WebSocket('ws://localhost:5000')
        socket.addEventListener('message', e => {
            SocketMessages(JSON.parse(e.data))
        })
        socket.addEventListener('open', () => {
            ShowChat()
            HelloSocket(nickName)
        })
    }
})

messageForm.addEventListener('submit', e => {
    e.preventDefault()
    const message = e.target.elements.message.value.trim()
    if(message === '') alert('Сообщение не должно быть пустым!')
    else socket.send(JSON.stringify({ type: 'message', message: message }))
    e.target.elements.message.value = ''
})

myImgBlock.addEventListener('click', () => {
    picturePopup.hidden = false
})

picturePopupClose.addEventListener('click', () => {
    picturePopup.hidden = true
    pictureInput.value = ''
    pictureInputImg.hidden = true
})

pictureInput.addEventListener('change', e => {
    if(e.target.value && e.target.value !== ''){
        const reader = new FileReader()
        reader.onload = () => {
            pictureInputImg.src = reader.result;
        }
        reader.readAsDataURL(e.target.files[0])
        pictureInputImg.hidden = false
    }else pictureInputImg.hidden = true
})

pictureCancel.addEventListener('click', () => {
    picturePopupClose.click()
})

pictureForm.addEventListener('submit', e => {
    e.preventDefault()
    const formData = new FormData(e.target)
    fetch('/upload', {
        method: 'POST',
        body: formData,
    })
        .then((res) => res.json())
        .then(({ image }) => {
            const request = {
                type: 'avatar',
                data: image,
            }
            socket.send(JSON.stringify(request))
            picturePopupClose.click()
        })
})

function SocketMessages(data){
    switch (data.type) {
        case 'login':
            if (data.from !== nickName) ShowNotification(data.from, 'login')
            BuildUsersListPanel(data.data)
            break
        case 'log-out':
            ShowNotification(data.from, 'logout')
            RemoveUserFromPanel(data.from)
            break
        case 'message':
            AddMessageToChat(data.from, data.data)
            break
        case 'avatar':
            updateAvatar(data.data)
    }
}

function updateAvatar(data){
    const avatars = document.querySelectorAll('[data-user="'+data.from+'"] img')
    avatars.forEach(userAvatar => {
        userAvatar.setAttribute('src', data.image)
    });
}

function HelloSocket(nick){
    socket.send(JSON.stringify({
        type: 'login',
        name: nick
    }))
}

function ShowNotification(userNick, type){
    const notify = document.createElement('div')
    notify.classList.add('system_message')
    switch (type) {
        case 'login':
            notify.textContent = `Пользователь ${userNick} вошел в чат`
            break
        case 'logout':
            notify.textContent = `Пользователь ${userNick} покинул чат`
            break
    }
    chat.append(notify)
    lastUserMsg = false
}

function ShowChat(){
    authForm.hidden = true
    chatAside.hidden = false
    chatWrapper.hidden = false
    myNickText.textContent = nickName
    picturePopup.querySelector('.avatar_form_nick').textContent = nickName
    myImgBlock.setAttribute('data-user', nickName)
}

function RemoveUserFromPanel(nick){
    document.querySelector('aside [data-user="'+nick+'"]').remove()
}

function BuildUsersListPanel(data){
    if(data.length){
        let othersHTML = ''
        for (let userData of data){
            if(userData.userLogin !== nickName) othersHTML += RenderPanelUser(userData.userLogin, userData.image)
        }
        otherUsers.innerHTML = othersHTML
    }
}

function RenderPanelUser(nick,img){
    return `<div class="side_chat_block" data-user="${nick}">
                <div class="side_chat_img">
                    <img src="${img}" alt="avatar">
                </div>
                <div class="side_chat_text">
                    <div class="side_chat_nick">${nick}</div>
                </div>
            </div>`
}

function AddMessageToChat(nickUser, message){
    let wrapper
    if(lastUserMsg !== nickUser){
        wrapper = document.createElement('div')
        wrapper.classList.add('chat_block')
        if(nickName === nickUser) wrapper.classList.add('chat_block_mine')
        const imgBlock = document.createElement('div')
        imgBlock.setAttribute('data-user', nickUser)
        imgBlock.classList.add('chat_img')
        const img = document.createElement('img')
        img.setAttribute('alt', nickUser)
        img.setAttribute('src', document.querySelector('aside [data-user="'+nickUser+'"] img').getAttribute('src'))
        imgBlock.append(img)
        wrapper.append(imgBlock)
        const nickBlock = document.createElement('div')
        nickBlock.classList.add('chat_nick')
        nickBlock.textContent = nickUser
        wrapper.append(nickBlock)
        chat.append(wrapper)
    }
    wrapper = chat.lastElementChild
    const msgBlock = document.createElement('span')
    msgBlock.classList.add('chat_msg')
    msgBlock.textContent = message
    const msgTime = document.createElement('span')
    const date = new Date();
    msgTime.textContent = `${date.getHours()}:${date.getMinutes()}`
    msgBlock.append(msgTime)
    wrapper.append(msgBlock)
    wrapper.append(document.createElement('br'))
    lastUserMsg = nickUser
}