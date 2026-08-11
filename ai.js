// ai.js — Supabase version (chat only; unused sandbox/dashboard code removed)
import { supabase } from './supabase-config.js';
import { getCurrentUser } from './auth.js';
import { API_BASE_URL } from './api-config.js';

export async function renderAI() {
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'Pet AI Guide';

  const user = getCurrentUser();
  if (!user) {
    viewport.innerHTML = `
      <div class="auth-wrapper" style="min-height: calc(100vh - 120px);">
        <div class="glass-card text-center" style="max-width: 420px; padding: 2rem;">
          <i class="fa-solid fa-lock" style="font-size: 3rem; color: var(--teal); margin-bottom: 1rem;"></i>
          <h2>Authentication Required</h2>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.5rem;">Please log in to access the PawTrace Pet AI Guide.</p>
          <a href="#/login" class="btn btn-primary mt-2">Log In</a>
        </div>
      </div>
    `;
    return;
  }

  viewport.innerHTML = `
    <div style="margin-bottom: 1.5rem;">
      <h2 style="font-family: 'Outfit', sans-serif; font-size: 1.6rem; font-weight: 700; color: var(--teal);">
        <i class="fa-solid fa-wand-magic-sparkles"></i> Pet AI Guide
      </h2>
      <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.25rem;">Ask about your pets, get medical info, set reminders, or ask how to use PawTrace.</p>
    </div>
    <div class="glass-card" style="padding: 1.25rem; display: flex; flex-direction: column; height: 500px;">
      <div id="chat-messages" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 0.75rem; padding-right: 0.5rem; margin-bottom: 1rem;">
        <div class="chat-msg-bot" style="align-self: flex-start; max-width: 80%; background: rgba(15,118,110,0.08); padding: 0.75rem 1rem; border-radius: 12px; font-size: 0.85rem; color: var(--text-main);">
          Hi! Ask me anything about your pets, or how to use PawTrace.
        </div>
      </div>
      <div style="display: flex; gap: 0.5rem;">
        <input type="text" id="chat-input" class="form-control" style="flex: 1;" placeholder="Type a message...">
        <button id="chat-send-btn" class="btn btn-primary" style="background: var(--teal); font-weight: 600;">
          <i class="fa-solid fa-paper-plane"></i>
        </button>
      </div>
    </div>
  `;

  function appendMessage(role, text) {
    const messagesEl = document.getElementById('chat-messages');
    const bubble = document.createElement('div');
    bubble.className = role === 'user' ? 'chat-msg-user' : 'chat-msg-bot';
    bubble.style.cssText = role === 'user'
      ? 'align-self: flex-end; max-width: 80%; background: var(--teal); color: white; padding: 0.75rem 1rem; border-radius: 12px; font-size: 0.85rem;'
      : 'align-self: flex-start; max-width: 80%; background: rgba(15,118,110,0.08); padding: 0.75rem 1rem; border-radius: 12px; font-size: 0.85rem; color: var(--text-main);';
    bubble.textContent = text;
    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return bubble;
  }

  async function sendChatMessage() {
    const inputEl = document.getElementById('chat-input');
    const text = inputEl.value.trim();
    if (!text) return;

    appendMessage('user', text);
    inputEl.value = '';
    const typingBubble = appendMessage('bot', 'Typing...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`${API_BASE_URL}/api/chatbot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message: text })
      });

      const data = await response.json();
      typingBubble.textContent = data.reply || data.error || 'Something went wrong.';
    } catch (err) {
      console.error('Chat error:', err);
      typingBubble.textContent = 'Failed to reach the assistant. Please try again.';
    }
  }

  document.getElementById('chat-send-btn').onclick = sendChatMessage;
  document.getElementById('chat-input').onkeypress = (e) => { if (e.key === 'Enter') sendChatMessage(); };
}