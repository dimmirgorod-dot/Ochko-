const url = "https://" + "www." + "gstatic.com" + "/firebasejs/10.8.0/firebase-firestore-compat.js";
fetch(url).then(r => r.text()).then(t => eval(t));
