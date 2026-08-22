// ==========================================================================
// COMMUNITY FEED & SOCIAL ENGAGEMENT HUB (Supabase)
// ==========================================================================

import { supabase } from './supabase-config.js';
import { getCurrentUser } from './auth.js';
import { showToast, showLoading, validateFile, FILE_LIMITS, readFileAsDataURL, formatFriendlyDate } from './utils.js';
import { escapeHTML } from './utils.js';
let currentFilter = 'All';

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

    <div style="display:grid; grid-template-columns: 2fr 1fr; gap:2rem;">

      <div style="display:flex; flex-direction:column; gap:1.5rem;">

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

        <div style="display:flex; gap:0.5rem; overflow-x:auto; padding-bottom:0.25rem;">
          ${['All', 'showcase', 'tips', 'stories', 'qa'].map(cat => `
            <button class="btn btn-outline filter-chip ${currentFilter === cat ? 'active' : ''}" data-category="${cat}" style="padding:0.4rem 1rem; font-size:0.75rem; border-radius:var(--radius-full);">
              ${cat === 'All' ? 'All Posts' : cat.toUpperCase()}
            </button>
          `).join('')}
        </div>

        <div id="community-posts-container" class="community-feed">
          <div class="skeleton-container"><div class="skeleton skeleton-card"></div></div>
        </div>

      </div>

      <div>
        <div class="glass-card mb-3">
          <h4 style="font-weight:700; margin-bottom:0.5rem; color:var(--terracotta);">Trending Discussions</h4>
          <p style="font-size:0.75rem; color:var(--text-muted); line-height:1.4;">
            Participate in threads. Vets carry specialty verification badges to ensure high quality medical answers.
          </p>
        </div>

        <div class="glass-card text-center" style="padding:1.5rem 1rem;">
          <h4 style="font-weight:700; margin-bottom:0.5rem;"><i class="fa-solid fa-award" style="color:var(--accent-yellow);"></i> Top Contributors</h4>
          <div id="top-contributors-list" style="display:flex; flex-direction:column; gap:0.75rem; margin-top:1rem;">
            <div class="skeleton skeleton-text"></div>
          </div>
        </div>
      </div>

    </div>
  `;

  document.querySelectorAll('.filter-chip').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-category');
      loadCommunityPosts();
    };
  });

  const postForm = document.getElementById('community-post-form');
  postForm.onsubmit = async (e) => {
    e.preventDefault();
    await createCommunityPost();
  };

  await loadCommunityPosts();
  await loadTopContributors();
}

/**
 * Real top contributors: verified vets and approved NGOs with the most posts
 */
async function loadTopContributors() {
  const container = document.getElementById('top-contributors-list');
  if (!container) return;

  try {
    const { data: posts } = await supabase.from('community_posts').select('author_id');
    const counts = {};
    (posts || []).forEach(p => { counts[p.author_id] = (counts[p.author_id] || 0) + 1; });

    const { data: users } = await supabase
      .from('users')
      .select('id, display_name, role, vet_details, ngo_details')
      .in('role', ['vet', 'ngo']);

    const contributors = (users || [])
      .filter(u => counts[u.id])
      .map(u => ({ ...u, postCount: counts[u.id] }))
      .sort((a, b) => b.postCount - a.postCount)
      .slice(0, 3);

    if (contributors.length === 0) {
      container.innerHTML = `<p style="font-size:0.75rem; color:var(--text-muted);">No verified contributors yet.</p>`;
      return;
    }

    container.innerHTML = contributors.map(c => `
      <div style="display:flex; gap:0.5rem; align-items:center; text-align:left; font-size:0.8rem;">
        <div style="width:32px; height:32px; border-radius:50%; overflow:hidden;"><img src="https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(c.display_name || c.id)}" style="width:100%; height:100%;"></div>
        <div>
          <strong>${escapeHTML(c.display_name || 'Contributor')}</strong>${c.role === 'vet' ? '<i class="fa-solid fa-circle-check verified-icon"></i>' : '<i class="fa-solid fa-shield-heart ngo-verified-icon"></i>'}
          <span style="font-size:0.65rem; color:var(--text-muted); display:block;">${c.role === 'vet' ? 'Verified Veterinarian' : 'NGO Coordinator'}</span>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.warn("Top contributors load failed:", err);
  }
}

async function loadCommunityPosts() {
  const container = document.getElementById('community-posts-container');
  if (!container) return;

  container.innerHTML = `<div class="skeleton-container"><div class="skeleton skeleton-card"></div></div>`;

  try {
    let query = supabase.from('community_posts').select('*, users!community_posts_author_id_fkey(display_name, photo_url, role)').order('created_at', { ascending: false });

    if (currentFilter !== 'All') {
      query = query.eq('category', currentFilter);
    }

    const { data: posts, error } = await query;
    if (error) throw error;

    container.innerHTML = '';

    if (!posts || posts.length === 0) {
      container.innerHTML = `
        <div class="empty-state-mini" style="padding: 3rem 0;">
          <i class="fa-solid fa-comments"></i>
          <p>No community posts found matching category: ${currentFilter}</p>
        </div>
      `;
      return;
    }

    const user = getCurrentUser();

    posts.forEach(post => {
      const author = post.users || {};
      const isLiked = post.likes && post.likes.includes(user.uid);
      const likesCount = post.likes ? post.likes.length : 0;

      let roleBadge = '';
      if (author.role === 'vet') {
        roleBadge = `<span class="post-badge vet"><i class="fa-solid fa-stethoscope"></i> Vet <i class="fa-solid fa-circle-check verified-icon" style="font-size:0.6rem;"></i></span>`;
      } else if (author.role === 'ngo') {
        roleBadge = `<span class="post-badge ngo"><i class="fa-solid fa-handshake-angle"></i> Rescue <i class="fa-solid fa-shield-heart ngo-verified-icon" style="font-size:0.6rem;"></i></span>`;
      } else {
        roleBadge = `<span class="post-badge owner">Guardian</span>`;
      }

      const card = document.createElement('div');
      card.className = 'glass-card post-card magnetic-card';
      card.innerHTML = `
        <div class="post-header">
          <div class="post-avatar">
            <img src="${author.photo_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + (author.display_name || post.author_id)}" style="width:100%; height:100%; object-fit:cover;">
          </div>
          <div class="post-meta">
            <span class="post-author">${author.display_name || 'PawTrace User'} ${roleBadge}</span>
            <span class="post-time">${formatFriendlyDate(post.created_at)}</span>
          </div>
        </div>

        <h3 class="post-title">${escapeHTML(post.title)}</h3>
        <p class="post-body">${escapeHTML(post.content)}</p>

        ${post.photo_url ? `<img src="${post.photo_url}" class="post-image" alt="Milestone Photo">` : ''}

        <div class="post-actions">
          <button class="post-action-btn btn-like ${isLiked ? 'liked' : ''}" data-id="${post.id}" data-liked="${isLiked}">
            <i class="fa-solid fa-heart"></i> <span>Likes (${likesCount})</span>
          </button>
          <button class="post-action-btn btn-comment-toggle" data-id="${post.id}">
            <i class="fa-solid fa-comment"></i> <span>Comments</span>
          </button>
        </div>

        <div id="comments-drawer-${post.id}" class="comments-box hidden">
          <div class="comment-input-row">
            <input type="text" id="comment-input-${post.id}" class="form-control" placeholder="Write a comment..." style="padding:0.4rem 0.8rem; font-size:0.8rem;">
            <button class="btn btn-secondary btn-submit-comment" data-id="${post.id}" style="padding:0.4rem 1rem; font-size:0.8rem;">
              Comment
            </button>
          </div>
          <div id="comments-list-${post.id}" class="comment-list">
          </div>
        </div>
      `;

      container.appendChild(card);
    });

    bindEngagementListeners(container);

  } catch (err) {
    console.error("Community Feed Load Error:", err);
    container.innerHTML = `<p>Failed to sync community forum feed.</p>`;
  }
}

function bindEngagementListeners(feedContainer) {
  const user = getCurrentUser();

  feedContainer.querySelectorAll('.btn-like').forEach(btn => {
    btn.onclick = async () => {
      const postId = btn.getAttribute('data-id');
      const liked = btn.getAttribute('data-liked') === 'true';

      btn.disabled = true;
      try {
        const { data: post, error: fetchErr } = await supabase.from('community_posts').select('likes').eq('id', postId).single();
        if (fetchErr) throw fetchErr;

        let updatedLikes = post.likes || [];
        if (liked) {
          updatedLikes = updatedLikes.filter(id => id !== user.uid);
        } else {
          updatedLikes = [...updatedLikes, user.uid];
        }

        const { error: updateErr } = await supabase.from('community_posts').update({ likes: updatedLikes }).eq('id', postId);
        if (updateErr) throw updateErr;

        loadCommunityPosts();
      } catch (err) {
        console.warn("Likes update failure:", err);
      } finally {
        btn.disabled = false;
      }
    };
  });

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

  feedContainer.querySelectorAll('.btn-submit-comment').forEach(btn => {
    btn.onclick = async () => {
      const postId = btn.getAttribute('data-id');
      const input = document.getElementById(`comment-input-${postId}`);
      const text = input.value.trim();

      if (!text) return;

      btn.disabled = true;
      try {
        const { error } = await supabase.from('community_comments').insert({
          post_id: postId,
          author_id: user.uid,
          content: text
        });
        if (error) throw error;

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
    const { data: comments, error } = await supabase
      .from('community_comments')
      .select('*, users!community_comments_author_id_fkey(display_name)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    container.innerHTML = '';

    if (!comments || comments.length === 0) {
      container.innerHTML = `<p style="font-size:0.75rem; color:var(--text-muted);">No comments yet. Start the discussion!</p>`;
      return;
    }

    comments.forEach(c => {
      const div = document.createElement('div');
      div.className = 'comment-item';
      div.innerHTML = `
        <div class="comment-author-row">
          <strong style="color:var(--teal);">${escapeHTML((c.users && c.users.display_name) || 'PawTrace User')}</strong>
          <span style="font-size:0.65rem; color:var(--text-muted);">${formatFriendlyDate(c.created_at)}</span>
        </div>
        <p style="margin:0; font-size:0.8rem; line-height:1.3;">${escapeHTML(c.content)}</p>
      `;
      container.appendChild(div);
    });

  } catch (err) {
    container.innerHTML = `<p>Failed to sync comments feed.</p>`;
  }
}

async function createCommunityPost() {
  const title = document.getElementById('post-title').value.trim();
  const category = document.getElementById('post-category').value;
  const content = document.getElementById('post-content').value.trim();
  const photoInput = document.getElementById('post-photo');

  const user = getCurrentUser();
  if (!user) return;

  let photoUrl = '';
  if (photoInput.files.length > 0) {
    const file = photoInput.files[0];
    const error = validateFile(file, FILE_LIMITS.IMAGE_TYPES, FILE_LIMITS.IMAGE_MAX_SIZE);
    if (error) {
      showToast(error, "warning");
      return;
    }
    photoUrl = await readFileAsDataURL(file);
  }

  showLoading(true, "Publishing board post...");
  try {
    const { error } = await supabase.from('community_posts').insert({
      author_id: user.uid,
      title,
      content,
      photo_url: photoUrl,
      category,
      likes: []
    });
    if (error) throw error;

    showToast("Post shared with PawTrace community!", "success");

    document.getElementById('post-title').value = '';
    document.getElementById('post-content').value = '';
    photoInput.value = '';

    loadCommunityPosts();
    loadTopContributors();
  } catch (err) {
    console.error("Posting Error:", err);
    showToast("Failed to share post.", "error");
  } finally {
    showLoading(false);
  }
}