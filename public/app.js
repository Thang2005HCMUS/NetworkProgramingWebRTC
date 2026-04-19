const socket = io();
let localStream;
let peerConnection;
let currentPartnerId = null; // Biến lưu ID đối phương
const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const btnJoin = document.getElementById('btn-join');
const usernameInput = document.getElementById('username');
const userList = document.getElementById('user-list');

// 1. Cấp quyền Camera
async function startMedia() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
    } catch (err) {
        alert("Không thể truy cập camera: " + err.message);
    }
}

// 2. Tham gia hệ thống
btnJoin.addEventListener('click', () => {
    const name = usernameInput.value;
    if (name) {
        socket.emit('join', name);
        startMedia();
        usernameInput.disabled = true;
        btnJoin.disabled = true;
    }
});

// Hàm khởi tạo PeerConnection (Dùng chung cho cả 2 bên để tránh lỗi)
function createPeerConnection(partnerId) {
    const pc = new RTCPeerConnection(config);
    
    // Thêm luồng của mình vào peer
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    
    pc.onicecandidate = e => {
        if (e.candidate) socket.emit('signal', { targetId: partnerId, signalData: { candidate: e.candidate } });
    };
    
    pc.ontrack = e => {
        console.log("Đã nhận luồng từ đối phương");
        remoteVideo.srcObject = e.streams[0];
    };
    
    return pc;
}

// 3. Cập nhật danh sách online
socket.on('update-user-list', (users) => {
    userList.innerHTML = '';
    users.forEach(user => {
        if (user.id === socket.id) return;
        const li = document.createElement('li');
        li.className = 'user-item';
        li.innerHTML = `
            <span>${user.name} <i class="fas fa-circle ${user.status === 'idle' ? 'status-idle' : 'status-busy'}"></i></span>
            ${user.status === 'idle' ? `<button onclick="requestCall('${user.id}')">Gọi</button>` : '<span>Đang bận</span>'}
        `;
        userList.appendChild(li);
    });
});

// 4. Logic gọi điện
function requestCall(targetId) {
    currentPartnerId = targetId;
    socket.emit('call-request', { targetId });
}

socket.on('incoming-call', ({ fromId, fromName }) => {
    currentPartnerId = fromId;
    const modal = document.getElementById('call-modal');
    modal.classList.remove('hidden');
    document.getElementById('call-message').innerText = `${fromName} đang gọi bạn!`;
    
    document.getElementById('btn-accept').onclick = () => {
        socket.emit('accept-call', { fromId });
        modal.classList.add('hidden');
    };
});

socket.on('call-accepted', async ({ targetId }) => {
    peerConnection = createPeerConnection(targetId);
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('signal', { targetId, signalData: { offer } });
});

socket.on('signal', async ({ fromId, signalData }) => {
    if (!peerConnection) {
        peerConnection = createPeerConnection(fromId);
    }

    if (signalData.offer) {
        await peerConnection.setRemoteDescription(signalData.offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('signal', { targetId: fromId, signalData: { answer } });
    } else if (signalData.answer) {
        await peerConnection.setRemoteDescription(signalData.answer);
    } else if (signalData.candidate) {
        await peerConnection.addIceCandidate(signalData.candidate);
    }
});

// Xử lý ngắt kết nối
socket.on('call-ended', () => {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    remoteVideo.srcObject = null;
});

document.getElementById('btn-hangup').onclick = () => {
    socket.emit('end-call');
    if(peerConnection) { peerConnection.close(); peerConnection = null; }
    remoteVideo.srcObject = null;
};