const firebaseConfig = {
  apiKey: "AIzaSyBp-qAfQp89TQCJXR_vnOlZ3LrTaOQfurM",
  authDomain:"ochko-d1323firebaseapp.com",
  projectId: "ochko-d1323",
  storageBucket: "ochko-d1323.firebasestorage.app",
  messagingSenderId: "26791758713",
  appId: "1:26791758713:web:ba7053922fadc38503bda8"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

const map = L.map('map', { zoomControl: false }).setView([55.75, 37.62], 10); 
L.control.zoom({ position: 'topleft' }).addTo(map);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

let temporaryCoords = null;

document.getElementById('photo').addEventListener('change', (e) => {
    const name = e.target.files && e.target.files.length > 0 ? e.target.files.name : "Файл не выбран";
    document.getElementById('file-name').innerText = name;
});

map.on('click', (e) => {
    temporaryCoords = e.latlng;
    document.getElementById('modal').style.display = 'flex';
});

document.getElementById('cancel-btn').addEventListener('click', closeByCancel);
function closeByCancel() {
    document.getElementById('modal').style.display = 'none';
    document.getElementById('marker-form').reset();
    document.getElementById('file-name').innerText = "Файл не выбран";
    temporaryCoords = null;
}

document.getElementById('marker-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const author = document.getElementById('author').value;
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const category = document.getElementById('category').value;
    const photoFile = document.getElementById('photo').files[0]; 
    if (!temporaryCoords) return;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.innerText = "Сохранение...";
    submitBtn.disabled = true;

    let photoUrl = "";
    let photoStoragePath = "";

    try {
        if (photoFile) {
            photoStoragePath = `images/${Date.now()}_${photoFile.name}`;
            const storageRef = storage.ref().child(photoStoragePath);
            await storageRef.put(photoFile);
            photoUrl = await storageRef.getDownloadURL();
        }

        await db.collection("markers").add({
            lat: temporaryCoords.lat,
            lng: temporaryCoords.lng,
            author,
            title,
            description,
            category,
            photoUrl,
            photoStoragePath,
            createdAt: new Date().toISOString()
        });
        closeByCancel();
    } catch (error) {
        alert("Ошибка: " + error.message);
    } finally {
        submitBtn.innerText = "Сохранить";
        submitBtn.disabled = false;
    }
});

const markersOnMap = {}; 
db.collection("markers").onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        const id = change.doc.id;
        if (change.type === "added") {
            const marker = L.marker([data.lat, data.lng]).addTo(map);
            let popupContent = `<div style="font-size:14px; min-width:180px;"><strong>${data.title}</strong> <small>(${data.category})</small><br><p style="margin:5px 0;">${data.description}</p><small style="color:#999;">Автор: ${data.author}</small><br>`;
            if (data.photoUrl) popupContent += `<img src="${data.photoUrl}" class="popup-img" style="width:100%; max-width:250px; border-radius:8px; margin-top:8px; display:block;"/>`;
            popupContent += `<button onclick="window.deleteMarker('${id}', '${data.photoStoragePath}')" style="margin-top:10px; background:#dc3545; color:white; border:none; padding:5px 8px; border-radius:4px; font-size:12px; width:100%; cursor:pointer;">Удалить ошибку</button></div>`;
            marker.bindPopup(popupContent);
            markersOnMap[id] = marker; 
        }
        if (change.type === "removed" && markersOnMap[id]) {
            map.removeLayer(markersOnMap[id]);
            delete markersOnMap[id];
        }
    });
});

window.deleteMarker = async (id, photoPath) => {
    if (confirm("Удалить метку?")) {
        try {
            await db.collection("markers").doc(id).delete();
            if (photoPath) await storage.ref().child(photoPath).delete();
        } catch (error) { alert("Ошибка: " + error.message); }
    }
};

document.getElementById('geo-btn').addEventListener('click', () => {
    if (!navigator.geolocation) return alert("Гео не поддерживается");
    navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        map.setView([latitude, longitude], 15);
        L.circle([latitude, longitude], { radius: 15, color: '#007bff' }).addTo(map);
    }, () => alert("Включите GPS"));
});
