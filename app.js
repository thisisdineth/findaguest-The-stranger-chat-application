import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getDatabase, ref, push, set, onValue, remove, update, get } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyA46ArJ8xW8XwDPe0f3DKiPu3Ve_0n4A54",
    authDomain: "xclonev2-5106c.firebaseapp.com",
    projectId: "xclonev2-5106c",
    storageBucket: "xclonev2-5106c.appspot.com",
    messagingSenderId: "402683016295",
    appId: "1:402683016295:web:2226862af77fadfe5910c2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

// Auth State Listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        loadTweets();
        loadProfilePicture();
    } else {
        window.location.href = "signup.html";
    }
});

// Post Tweet
document.getElementById('tweet-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = document.getElementById('tweet-content').value;

    if (content.trim() === "") {
        alert("Tweet cannot be empty!");
        return;
    }

    const tweetRef = push(ref(db, 'tweets/'));
    await set(tweetRef, {
        uid: auth.currentUser.uid,
        author: auth.currentUser.displayName || auth.currentUser.email,
        content: content,
        timestamp: Date.now(),
        likes: 0,
        likedBy: [],  // To store users who liked the tweet
        replies: []  // To store replies
    });

    document.getElementById('tweet-content').value = ''; 
});

// Load Tweets
function loadTweets() {
    const tweetsRef = ref(db, 'tweets/');
    onValue(tweetsRef, (snapshot) => {
        const tweetsList = document.getElementById('tweets');
        tweetsList.innerHTML = '';

        snapshot.forEach((childSnapshot) => {
            const tweet = childSnapshot.val();
            const tweetId = childSnapshot.key;
            const li = document.createElement('li');

            li.innerHTML = `
                <div class="tweet-author">${tweet.author}</div>
                <div class="tweet-content">${tweet.content}</div>
                <div class="tweet-actions">
                    <button onclick="likeTweet('${tweetId}')">Like (${tweet.likes})</button>
                    <button onclick="showReplyInput('${tweetId}')">Reply</button>
                    ${tweet.uid === auth.currentUser.uid ? `<button onclick="deleteTweet('${tweetId}')">Delete</button>` : ''}
                </div>
                <ul id="replies-${tweetId}" class="replies-list"></ul>
                <div id="reply-input-${tweetId}" style="display: none;">
                    <textarea id="reply-content-${tweetId}" placeholder="Write a reply..."></textarea>
                    <button onclick="replyTweet('${tweetId}')">Submit Reply</button>
                </div>
            `;

            tweetsList.appendChild(li);
            loadReplies(tweetId, tweet.replies);
        });
    });
}

// Like Tweet
window.likeTweet = async function (tweetId) {
    const tweetRef = ref(db, 'tweets/' + tweetId);
    const snapshot = await get(tweetRef);
    const tweet = snapshot.val();
    const userUid = auth.currentUser.uid;

    if (tweet.likedBy.includes(userUid)) {
        alert("You can only like this tweet once.");
        return;
    }

    tweet.likedBy.push(userUid);
    update(tweetRef, { likes: tweet.likes + 1, likedBy: tweet.likedBy });
};

// Show Reply Input
window.showReplyInput = function (tweetId) {
    const replyInput = document.getElementById(`reply-input-${tweetId}`);
    replyInput.style.display = replyInput.style.display === 'none' ? 'block' : 'none';
};

// Reply to Tweet
window.replyTweet = async function (tweetId) {
    const content = document.getElementById(`reply-content-${tweetId}`).value;

    if (content.trim() === "") {
        alert("Reply cannot be empty!");
        return;
    }

    const replyRef = push(ref(db, `tweets/${tweetId}/replies/`));
    await set(replyRef, {
        uid: auth.currentUser.uid,
        author: auth.currentUser.displayName || auth.currentUser.email,
        content: content,
        timestamp: Date.now()
    });

    document.getElementById(`reply-content-${tweetId}`).value = ''; 
};

// Load Replies
function loadReplies(tweetId, replies) {
    const repliesList = document.getElementById(`replies-${tweetId}`);
    repliesList.innerHTML = '';

    for (let replyId in replies) {
        const reply = replies[replyId];
        const li = document.createElement('li');

        li.innerHTML = `
            <div class="reply-author">${reply.author}</div>
            <div class="reply-content">${reply.content}</div>
            ${reply.uid === auth.currentUser.uid ? `<button onclick="deleteReply('${tweetId}', '${replyId}')">Delete Reply</button>` : ''}
        `;

        repliesList.appendChild(li);
    }
}

// Delete Tweet
window.deleteTweet = function (tweetId) {
    const confirmDelete = confirm("Are you sure you want to delete this tweet?");
    if (confirmDelete) {
        remove(ref(db, 'tweets/' + tweetId));
    }
};

// Delete Reply
window.deleteReply = function (tweetId, replyId) {
    const confirmDelete = confirm("Are you sure you want to delete this reply?");
    if (confirmDelete) {
        remove(ref(db, `tweets/${tweetId}/replies/${replyId}`));
    }
};

// Upload Profile Picture
document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = document.getElementById('profile-picture').files[0];

    if (file && file.size <= 2 * 1024 * 1024) {
        const storageReference = storageRef(storage, 'profile_pictures/' + auth.currentUser.uid);
        const uploadTask = uploadBytesResumable(storageReference, file);

        uploadTask.on('state_changed', 
            (snapshot) => {},
            (error) => { console.error("Error uploading file:", error.message); },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                document.getElementById('profile-pic').src = downloadURL;
                await update(ref(db, 'users/' + auth.currentUser.uid), { profilePicture: downloadURL });
            }
        );
    } else {
        alert("Please upload a file less than 2MB.");
    }
});

// Load Profile Picture
function loadProfilePicture() {
    const user = auth.currentUser;
    if (user) {
        const storageReference = storageRef(storage, 'profile_pictures/' + user.uid);
        getDownloadURL(storageReference).then((url) => {
            document.getElementById('profile-pic').src = url;
        }).catch((error) => {
            console.error("Error loading profile picture:", error.message);
        });
    }
}

// Logout
document.getElementById('logout-button').addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = "signup.html";
    }).catch((error) => {
        console.error("Error signing out:", error.message);
    });
});
