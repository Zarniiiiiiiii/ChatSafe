// Initialize Supabase client
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
let currentUser = null;

async function joinChat() {
    const username = document.getElementById('username').value.trim();
    if (!username) {
        alert('Please enter your name');
        return;
    }

    currentUser = username;
    document.getElementById('login').classList.add('hidden');
    document.getElementById('chat').classList.remove('hidden');

    // Load previous messages
    const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error loading messages:', error);
        return;
    }

    messages.forEach(displayMessage);

    // Set up real-time subscription
    supabase
        .channel('public:messages')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
        }, (payload) => {
            displayMessage(payload.new);
        })
        .subscribe();

    // Focus message input
    document.getElementById('message').focus();
}

async function sendMessage() {
    const messageInput = document.getElementById('message');
    const text = messageInput.value.trim();

    if (!text) {
        alert('Please enter a message');
        return;
    }

    const { error } = await supabase
        .from('messages')
        .insert([{
            username: currentUser,
            message: text
        }]);

    if (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message. Please try again.');
        return;
    }

    messageInput.value = '';
    messageInput.focus();
}

function displayMessage(msg) {
    const messagesContainer = document.getElementById('messages-container');
    const isCurrentUser = msg.username === currentUser;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isCurrentUser ? 'own' : 'other'}`;
    
    const headerDiv = document.createElement('div');
    headerDiv.className = 'message-header';
    
    const usernameSpan = document.createElement('span');
    usernameSpan.className = 'username';
    usernameSpan.textContent = msg.username;
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'time';
    timeSpan.textContent = new Date(msg.created_at).toLocaleTimeString();
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = msg.message;
    
    headerDiv.appendChild(usernameSpan);
    headerDiv.appendChild(timeSpan);
    messageDiv.appendChild(headerDiv);
    messageDiv.appendChild(contentDiv);
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Handle Enter key for sending messages
document.getElementById('message').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
}); 