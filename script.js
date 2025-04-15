// Debug logging function
function debugLog(message, data = null) {
    console.log(message, data);
    const debugInfo = document.getElementById('debug-info');
    const entry = document.createElement('div');
    entry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
    if (data) {
        entry.textContent += ` - ${JSON.stringify(data)}`;
    }
    debugInfo.appendChild(entry);
    debugInfo.scrollTop = debugInfo.scrollHeight;
}

// Initialize Supabase properly
const { createClient } = supabase;
const SUPABASE_URL = 'https://zytziiucuiitksovhaqg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5dHppaXVjdWlpdGtzb3ZoYXFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3MjI5MjYsImV4cCI6MjA2MDI5ODkyNn0.oO0LuMRI9jnXHkeEtpWLgt9HsMblusLAzfhI1c5No5M';

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
let currentUser = null;

// Test Supabase connection
async function testConnection() {
    try {
        const { data, error } = await supabaseClient
            .from('messages')
            .select('*')
            .limit(1);

        if (error) {
            debugLog('Connection test failed', error);
            throw error;
        }

        debugLog('Connection test successful', data);
        return true;
    } catch (error) {
        debugLog('Connection test error', error);
        return false;
    }
}

// Initialize the application
async function initializeApp() {
    debugLog('Initializing application...');
    
    // Test connection first
    const connected = await testConnection();
    if (!connected) {
        alert('Failed to connect to chat server. Please try again later.');
        return;
    }

    // Set up real-time test channel
    const channel = supabaseClient.channel('test')
        .on('broadcast', { event: 'test' }, (payload) => {
            debugLog('Test broadcast received', payload);
        })
        .subscribe((status) => {
            debugLog('Test channel subscription status', status);
        });

    debugLog('Application initialized successfully');
}

// Call initialization
initializeApp();

async function joinChat() {
    const username = document.getElementById('username').value.trim();
    if (!username) {
        alert('Please enter your name');
        return;
    }

    currentUser = username;
    document.getElementById('login').classList.add('hidden');
    document.getElementById('chat').classList.remove('hidden');

    debugLog('User joined chat', { username: currentUser });

    try {
        // Load previous messages
        const { data: messages, error } = await supabaseClient
            .from('messages')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            debugLog('Error loading messages', error);
            throw error;
        }

        debugLog('Loaded messages', { count: messages.length });
        messages.forEach(displayMessage);

        // Set up real-time subscription
        const channel = supabaseClient
            .channel('public:messages')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages'
            }, (payload) => {
                debugLog('New message received', payload);
                displayMessage(payload.new);
            })
            .subscribe((status) => {
                debugLog('Message channel subscription status', status);
            });

    } catch (error) {
        debugLog('Error in joinChat', error);
        alert('Failed to join chat. Please try again.');
        return;
    }

    document.getElementById('message').focus();
}

async function sendMessage() {
    const messageInput = document.getElementById('message');
    const text = messageInput.value.trim();

    if (!text) {
        alert('Please enter a message');
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('messages')
            .insert([{
                username: currentUser,
                message: text
            }]);

        if (error) {
            debugLog('Error sending message', error);
            throw error;
        }

        debugLog('Message sent successfully', { text });
        messageInput.value = '';
        messageInput.focus();
    } catch (error) {
        debugLog('Error in sendMessage', error);
        alert('Failed to send message. Please try again.');
    }
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