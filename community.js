// ==========================================================================
// COMMUNITY FEED & SOCIAL ENGAGEMENT HUB
// ==========================================================================

import { db, fb } from './firebase-config.js';
import { getCurrentUser } from './auth.js';
import { showToast, showLoading, validateFile, FILE_LIMITS, readFileAsDataURL, formatFriendlyDate } from './utils.js';

let currentFilter = 'All';

/**
 * Render the main community forum dashboard
 */
export async function renderCommunity() {
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'Community';

  const user = getCurrentUser();
  if (!user) return;

  viewport.innerHTML = `
    <div style="margin-bottom: 2rem;">
      <h2 style="font-family: 'Outfit', sans-serif; font-size: 1.6rem; font-weight: 700;">Community Forum</h2>
      <p style="color: var(--text-muted); font-size: 0.9rem;">
        Share achievements, read vet-approved guidelines, coordinate missing spottings, and showcase pet diaries.
      </p>
    </div>

    <!-- Forum Layout Split -->
    <div style="display:grid; grid-template-columns: 2fr 1fr; gap:2rem;">
      
      <!-- Main Feed -->
      <div style="display:flex; flex-direction:column; gap:1.5rem;">
        
        <!-- Post creation widget -->
        <div class="glass-card">
          <h3 style="font-weight:700; font-family:'Outfit'; margin-bottom:1rem; color:var(--teal);">Create a Post</h3>
          <form id="community-post-form" style="display:flex; flex-direction:column; gap:0.75rem;">
            <div class="form-row">
              <div class="form-group">
                <input type="text" id="post-title" class="form-control" placeholder="Post Title *" required style="padding:0.6rem 1rem; font-size:0.85rem;">
              </div>
              <div class="form-group">
                <select id="post-category" class="form-control" style="padding:0.6rem 1rem; font-size:0.85rem;">
                  <option value="showcase">Showcase Pets</option>
                  <option value="tips">Health & Care Tips</option>
                  <option value="stories">Recovery Stories</option>
                  <option value="qa">Questions & Answers</option>
                </select>
              </div>
            </div>
            
            <div class="form-group">
              <textarea id="post-content" class="form-control" rows="3" placeholder="Share tips, questions, or showcases..." required style="padding:0.6rem 1rem; font-size:0.85rem;"></textarea>
            </div>
            
            <div class="flex-between">
              <div class="form-group" style="margin:0;">
                <input type="file" id="post-photo" accept="image/*" style="font-size:0.75rem; max-width:200px;">
              </div>
              <button type="submit" class="btn btn-primary" style="padding:0.5rem 1.25rem; font-size:0.8rem;">
                <i class="fa-solid fa-paper-plane"></i> Share Post
              </button>
            </div>
          </form>
        </div>

        <!-- Filter Chips Bar -->
        <div style="display:flex; gap:0.5rem; overflow-x:auto; padding-bottom:0.25rem;">
          ${['All', 'showcase', 'tips', 'stories', 'qa'].map(cat => `
            <button class="btn btn-outline filter-chip ${currentFilter === cat ? 'active' : ''}" data-category="${cat}" style="padding:0.4rem 1rem; font-size:0.75rem; border-radius:var(--radius-full);">
              ${cat === 'All' ? 'All Posts' : cat.toUpperCase()}
            </button>
          `).join('')}
        </div>

        <!-- Dynamic Feed List -->
        <div id="community-posts-container" class="community-feed">
          <div class="skeleton-container"><div class="skeleton skeleton-card"></div></div>
        </div>

      </div>

      <!-- Sidebar -->
      <div>
        <div class="glass-card mb-3">
          <h4 style="font-weight:700; margin-bottom:0.5rem; color:var(--terracotta);">Trending Discussions</h4>
          <p style="font-size:0.75rem; color:var(--text-muted); line-height:1.4;">
            Participate in threads. Vets carry specialty verification badges to ensure high quality medical answers.
          </p>
        </div>
        
        <div class="glass-card text-center" style="padding:1.5rem 1rem;">
          <h4 style="font-weight:700; margin-bottom:0.5rem;"><i class="fa-solid fa-award" style="color:var(--accent-yellow);"></i> Top Contributors</h4>
          <div style="display:flex; flex-direction:column; gap:0.75rem; margin-top:1rem;">
            <div style="display:flex; gap:0.5rem; align-items:center; text-align:left; font-size:0.8rem;">
              <div style="width:32px; height:32px; border-radius:50%; overflow:hidden;"><img src="https://api.dicebear.com/7.x/bottts/svg?seed=dr_smith" style="width:100%; height:100%;"></div>
              <div>
                <strong>Dr. Clara Smith</strong> <i class="fa-solid fa-circle-check verified-icon"></i>
                <span style="font-size:0.65rem; color:var(--text-muted); display:block;">Verfied Veterinarian</span>
              </div>
            </div>
            <div style="display:flex; gap:0.5rem; align-items:center; text-align:left; font-size:0.8rem;">
              <div style="width:32px; height:32px; border-radius:50%; overflow:hidden;"><img src="https://api.dicebear.com/7.x/bottts/svg?seed=hope_ngo" style="width:100%; height:100%;"></div>
              <div>
                <strong>Hope Animal Rescue</strong> <i class="fa-solid fa-shield-heart ngo-verified-icon"></i>
                <span style="font-size:0.65rem; color:var(--text-muted); display:block;">NGO Coordinator</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  `;

  // Bind Category click changes
  document.querySelectorAll('.filter-chip').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-category');
      loadCommunityPosts();
    };
  });

  // Bind Post Creation form submit
  const postForm = document.getElementById('community-post-form');
  postForm.onsubmit = async (e) => {
    e.preventDefault();
    await createCommunityPost();
  };

  // Fetch Forum Posts
  await loadCommunityPosts();
}

/**
 * Fetch posts matching current filter configurations from Firestore
 */
async function loadCommunityPosts() {
  const container = document.getElementById('community-posts-container');
  if (!container) return;

  container.innerHTML = `<div class="skeleton-container"><div class="skeleton skeleton-card"></div></div>`;

  try {
    let query = db.collection('community_posts').orderBy('timestamp', 'desc');
    
    if (currentFilter !== 'All') {
      query = query.where('category', '==', currentFilter);
    }

    const snapshot = await query.get();
    container.innerHTML = '';

    if (snapshot.empty) {
      container.innerHTML = `
        <div class="empty-state-mini" style="padding: 3rem 0;">
          <i class="fa-solid fa-comments"></i>
          <p>No community posts found matching category: ${currentFilter}</p>
        </div>
      `;
      return;
    }

    const user = getCurrentUser();

    snapshot.forEach(doc => {
      const post = doc.data();
      post.id = doc.id;

      const isLiked = post.likes && post.likes.includes(user.uid);
      const likesCount = post.likes ? post.likes.length : 0;

      // Select verified badge markup according to user role
      let roleBadge = '';
      if (post.authorRole === 'vet') {
        roleBadge = `<span class="post-badge vet"><i class="fa-solid fa-stethoscope"></i> Vet <i class="fa-solid fa-circle-check verified-icon" style="font-size:0.6rem;"></i></span>`;
      } else if (post.authorRole === 'ngo') {
        roleBadge = `<span class="post-badge ngo"><i class="fa-solid fa-handshake-angle"></i> Rescue <i class="fa-solid fa-shield-heart ngo-verified-icon" style="font-size:0.6rem;"></i></span>`;
      } else {
        roleBadge = `<span class="post-badge owner">Guardian</span>`;
      }

      const card = document.createElement('div');
      card.className = 'glass-card post-card magnetic-card';
      card.innerHTML = `
        <div class="post-header">
          <div class="post-avatar">
            <img src="${post.authorAvatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + post.authorName}" style="width:100%; height:100%; object-fit:cover;">
          </div>
          <div class="post-meta">
            <span class="post-author">${post.authorName} ${roleBadge}</span>
            <span class="post-time">${formatFriendlyDate(post.timestamp)}</span>
          </div>
        </div>

        <h3 class="post-title">${post.title}</h3>
        <p class="post-body">${post.content}</p>
        
        ${post.photo ? `<img src="${post.photo}" class="post-image" alt="Milestone Photo">` : ''}

        <!-- Engagement Buttons -->
        <div class="post-actions">
          <button class="post-action-btn btn-like ${isLiked ? 'liked' : ''}" data-id="${post.id}" data-liked="${isLiked}">
            <i class="fa-solid fa-heart"></i> <span>Likes (${likesCount})</span>
          </button>
          <button class="post-action-btn btn-comment-toggle" data-id="${post.id}">
            <i class="fa-solid fa-comment"></i> <span>Comments</span>
          </button>
        </div>

        <!-- Comments Drawer -->
        <div id="comments-drawer-${post.id}" class="comments-box hidden">
          <div class="comment-input-row">
            <input type="text" id="comment-input-${post.id}" class="form-control" placeholder="Write a comment..." style="padding:0.4rem 0.8rem; font-size:0.8rem;">
            <button class="btn btn-secondary btn-submit-comment" data-id="${post.id}" style="padding:0.4rem 1rem; font-size:0.8rem;">
              Comment
            </button>
          </div>
          <div id="comments-list-${post.id}" class="comment-list">
            <!-- Dynamically populated comments -->
          </div>
        </div>
      `;

      container.appendChild(card);
    });

    // Bind Engagement Clicks
    bindEngagementListeners(container);

  } catch (err) {
    console.error("Community Feed Load Error:", err);
    container.innerHTML = `<p>Failed to sync community forum feed.</p>`;
  }
}

/**
 * Configure likes toggling and comments panel rendering
 */
function bindEngagementListeners(feedContainer) {
  const user = getCurrentUser();

  // 1. Likes Handlers
  feedContainer.querySelectorAll('.btn-like').forEach(btn => {
    btn.onclick = async () => {
      const postId = btn.getAttribute('data-id');
      const liked = btn.getAttribute('data-liked') === 'true';
      
      btn.disabled = true;
      try {
        const postRef = db.collection('community_posts').doc(postId);
        if (liked) {
          // Remove like
          await postRef.update({
            likes: fb.firestore.FieldValue.arrayRemove(user.uid)
          });
        } else {
          // Add like
          await postRef.update({
            likes: fb.firestore.FieldValue.arrayUnion(user.uid)
          });
        }
        loadCommunityPosts();
      } catch (err) {
        console.warn("Likes update failure:", err);
      } finally {
        btn.disabled = false;
      }
    };
  });

  // 2. Comments Drawer Toggles
  feedContainer.querySelectorAll('.btn-comment-toggle').forEach(btn => {
    btn.onclick = () => {
      const postId = btn.getAttribute('data-id');
      const drawer = document.getElementById(`comments-drawer-${postId}`);
      drawer.classList.toggle('hidden');
      if (!drawer.classList.contains('hidden')) {
        loadCommentsFeed(postId);
      }
    };
  });

  // 3. Comment Submission
  feedContainer.querySelectorAll('.btn-submit-comment').forEach(btn => {
    btn.onclick = async () => {
      const postId = btn.getAttribute('data-id');
      const input = document.getElementById(`comment-input-${postId}`);
      const text = input.value.trim();

      if (!text) return;

      btn.disabled = true;
      try {
        await db.collection('community_posts').doc(postId).collection('comments').add({
          authorId: user.uid,
          authorName: user.displayName || user.email.split('@')[0],
          content: text,
          timestamp: fb.firestore.FieldValue.serverTimestamp()
        });

        input.value = '';
        showToast("Comment published successfully.", "success");
        loadCommentsFeed(postId);
      } catch (err) {
        showToast("Failed to post comment.", "error");
      } finally {
        btn.disabled = false;
      }
    };
  });
}

async function loadCommentsFeed(postId) {
  const container = document.getElementById(`comments-list-${postId}`);
  if (!container) return;

  container.innerHTML = `<div class="skeleton skeleton-text"></div>`;
  try {
    const snapshot = await db.collection('community_posts').doc(postId).collection('comments')
      .orderBy('timestamp', 'asc')
      .get();
      
    container.innerHTML = '';

    if (snapshot.empty) {
      container.innerHTML = `<p style="font-size:0.75rem; color:var(--text-muted);">No comments yet. Start the discussion!</p>`;
      return;
    }

    snapshot.forEach(doc => {
      const c = doc.data();
      const div = document.createElement('div');
      div.className = 'comment-item';
      div.innerHTML = `
        <div class="comment-author-row">
          <strong style="color:var(--teal);">${c.authorName}</strong>
          <span style="font-size:0.65rem; color:var(--text-muted);">${formatFriendlyDate(c.timestamp)}</span>
        </div>
        <p style="margin:0; font-size:0.8rem; line-height:1.3;">${c.content}</p>
      `;
      container.appendChild(div);
    });

  } catch (err) {
    container.innerHTML = `<p>Failed to sync comments feed.</p>`;
  }
}

/**
 * Handle new post submission
 */
async function createCommunityPost() {
  const title = document.getElementById('post-title').value.trim();
  const category = document.getElementById('post-category').value;
  const content = document.getElementById('post-content').value.trim();
  const photoInput = document.getElementById('post-photo');

  const user = getCurrentUser();
  if (!user || !db) return;

  let photoUrl = '';
  if (photoInput.files.length > 0) {
    const file = photoInput.files[0];
    const error = validateFile(file, FILE_LIMITS.IMAGE_TYPES, FILE_LIMITS.IMAGE_MAX_SIZE);
    if (error) {
      showToast(error, "warning");
      return;
    }
    try {
      photoUrl = await readFileAsDataURL(file);
    } catch (err) {
      console.warn("Base64 reading failure:", err);
    }
  }

  showLoading(true, "Publishing board post...");
  try {
    // Resolve user role
    let authorRole = 'owner';
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (userDoc.exists) {
      authorRole = userDoc.data().role || 'owner';
    }

    await db.collection('community_posts').add({
      authorId: user.uid,
      authorName: user.displayName || user.email.split('@')[0],
      authorAvatar: user.photoURL || '',
      authorRole: authorRole,
      title,
      content,
      photo: photoUrl,
      likes: [],
      category,
      timestamp: fb.firestore.FieldValue.serverTimestamp()
    });

    showToast("Post shared with PawTrace community!", "success");
    
    // Reset forms
    document.getElementById('post-title').value = '';
    document.getElementById('post-content').value = '';
    photoInput.value = '';

    loadCommunityPosts();
  } catch (err) {
    console.error("Posting Error:", err);
    showToast("Failed to share post.", "error");
  } finally {
    showLoading(false);
  }
}
