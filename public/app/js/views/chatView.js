/**
 * Screen 3: Multilingual Voice / Chatbot & Healthcare Q&A View
 * Enhanced with Twi Phonetic Normalization, Female/Male Voice Tone Tuning, and MedASR-Ghana integration
 */
import { SpeechService } from '../speechService.js';

export const ChatView = {
  render(state) {
    const isTwi = state.language === 'twi';
    const isEng = state.language === 'english';
    const currentGender = state.voiceGender || SpeechService.voiceGender || 'female';

    return `
      <div class="card">
        <div class="card-title" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <span>🎙️ ${isTwi ? 'Twi Apɔmuden Boafoɔ' : isEng ? 'English Health Companion' : 'Multilingual Twi & English Companion'}</span>
          <span style="font-size: 0.75rem; color: var(--primary); background: var(--primary-glow); padding: 0.2rem 0.6rem; border-radius: 99px;">
            ${isTwi ? '🎙️ Twi Voice Mode' : isEng ? '🗣️ English Voice Mode' : '🌐 Dual Language Mode'}
          </span>
        </div>

        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 0.75rem;">
          ${isTwi ? 'Bisa nyinsɛn, mmofra hwɛ, ne aduruyɛ ho nsɛm nyinaa wɔ Twi mu. AI no bɛkasa kyerɛ wo.' : 'Ask maternal, infant, and nutrition questions in Simple English or Twi. The AI will speak answers back to you.'}
        </p>

        <!-- Voice Customization & Tone Tuning Control Bar -->
        <div style="background: rgba(15, 23, 42, 0.75); border: 1px solid var(--border-card); border-radius: var(--radius-md); padding: 0.75rem 1rem; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted);">🎙️ Voice Tone:</span>
            <button id="btn-gender-female" class="btn btn-secondary ${currentGender === 'female' ? 'active-gender' : ''}" style="padding: 0.25rem 0.65rem; font-size: 0.8rem; border-radius: 99px; ${currentGender === 'female' ? 'background: rgba(236, 72, 153, 0.2); border-color: #ec4899; color: #f472b6;' : ''}">
              👩 Female (Warm)
            </button>
            <button id="btn-gender-male" class="btn btn-secondary ${currentGender === 'male' ? 'active-gender' : ''}" style="padding: 0.25rem 0.65rem; font-size: 0.8rem; border-radius: 99px; ${currentGender === 'male' ? 'background: rgba(59, 130, 246, 0.2); border-color: #3b82f6; color: #60a5fa;' : ''}">
              👨 Male (Clear)
            </button>
          </div>

          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <button id="btn-test-voice-sample" class="speaker-btn" style="font-size: 0.78rem;">
              🔊 Test Voice Sample
            </button>
          </div>
        </div>

        <!-- Model Attribution Chips -->
        <div class="ai-tech-badges" style="margin-top: 0; margin-bottom: 1rem; border-top: none; padding-top: 0;">
          <span class="badge-chip hf">🤖 Gemini & Groq Medical AI</span>
          <span class="badge-chip medasr">🎙️ Abena AI (Twi Speech & ASR)</span>
          <span class="badge-chip khaya">🤗 Meta MMS Akan Neural TTS</span>
        </div>

        <!-- Preset Guidance Cards Horizontal Chips -->
        <div style="display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.75rem; margin-bottom: 1rem;">
          <button class="btn btn-secondary chip-preset" data-query="What local Ghanaian foods give iron during pregnancy?" style="white-space: nowrap; font-size: 0.8rem;">
            🥬 Ghana Foods for Iron
          </button>
          <button class="btn btn-secondary chip-preset" data-query="What are early warning signs of pregnancy complications?" style="white-space: nowrap; font-size: 0.8rem;">
            🚨 Danger Signs in Pregnancy
          </button>
          <button class="btn btn-secondary chip-preset" data-query="Can I drink Nibima or Taabea bitters for malaria while pregnant?" style="white-space: nowrap; font-size: 0.8rem;">
            🌿 Nibima / Taabea Safety
          </button>
        </div>

        <!-- Chat Transcript Area -->
        <div id="chat-messages" style="min-height: 280px; max-height: 440px; overflow-y: auto; display: flex; flex-direction: column; gap: 1rem; padding: 1rem; background: rgba(5, 8, 17, 0.6); border-radius: var(--radius-md); border: 1px solid var(--border-card); margin-bottom: 1rem;">
          ${this.renderDefaultMessages(state)}
        </div>

        <!-- Voice Recording Visualizer Wave Container (Hidden by default) -->
        <div id="chat-voice-wave" style="display: none; align-items: center; justify-content: center; gap: 0.5rem; margin-bottom: 0.75rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); padding: 0.5rem; border-radius: 8px; font-size: 0.85rem; color: #f87171;">
          <span>🔴 MedASR-Ghana Listening (Ghanaian Accent Speech)...</span>
          <div class="voice-wave-container" style="margin-top: 0;">
            <div class="voice-wave-bar"></div>
            <div class="voice-wave-bar"></div>
            <div class="voice-wave-bar"></div>
            <div class="voice-wave-bar"></div>
            <div class="voice-wave-bar"></div>
          </div>
        </div>

        <!-- Input Bar -->
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <button id="btn-mic-chat" class="btn btn-secondary" title="Tap to Speak Question in Twi or English" style="padding: 0.75rem 1rem; font-size: 1.1rem;">
            🎙️
          </button>
          <input type="text" id="chat-input" class="input-field" style="margin-bottom: 0; flex: 1;" placeholder="${isTwi ? 'Kyerɛw anaa kasa fa wo apɔwmudzi ho...' : 'Type question or speak into mic...'}" value="${state.pendingQuery || ''}" />
          <button id="btn-send-chat" class="btn btn-primary">
            Send &rarr;
          </button>
        </div>
      </div>
    `;
  },

  renderDefaultMessages(state) {
    const isTwi = state.language === 'twi';
    const isEng = state.language === 'english';

    if (isTwi) {
      return `
        <div class="ai-bubble-wrapper" style="align-self: flex-start; width: 88%; background: rgba(30, 41, 67, 0.85); border: 1px solid var(--border-card); padding: 1rem; border-radius: 12px; font-size: 0.9rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
            <span style="font-weight: 600; color: var(--primary); font-size: 0.8rem;">
              🩺 Guided Companion • Twi Mode
            </span>
            <button class="speaker-btn btn-read-welcome" data-text="Akwaaba! Me ne wo ho apɔmuden boafoɔ. Bisa me nyinsɛn mu aduane, abofra hwɛ, ne herbal tea ho asem nyinaa." data-lang="twi">
              🔊 Read Aloud
            </button>
          </div>
          <strong>Twi (Akan):</strong> Akwaaba! Me ne wo ho apɔmuden boafoɔ. Bisa me nyinsɛn mu aduane, abofra hwɛ, ne herbal tea ho asem nyinaa.
        </div>
      `;
    }

    if (isEng) {
      return `
        <div class="ai-bubble-wrapper" style="align-self: flex-start; width: 88%; background: rgba(30, 41, 67, 0.85); border: 1px solid var(--border-card); padding: 1rem; border-radius: 12px; font-size: 0.9rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
            <span style="font-weight: 600; color: var(--primary); font-size: 0.8rem;">
              🩺 Guided Companion • English Mode
            </span>
            <button class="speaker-btn btn-read-welcome" data-text="Akwaaba! I am your health companion. Ask me questions about maternal care, infant feeding, or herbal safety." data-lang="english">
              🔊 Read Aloud
            </button>
          </div>
          <strong>Simple English:</strong> Akwaaba! I am your health companion. Ask me questions about maternal care, infant feeding, or herbal safety.
        </div>
      `;
    }

    return `
      <div class="ai-bubble-wrapper" style="align-self: flex-start; width: 88%; background: rgba(30, 41, 67, 0.85); border: 1px solid var(--border-card); padding: 1rem; border-radius: 12px; font-size: 0.9rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
          <span style="font-weight: 600; color: var(--primary); font-size: 0.8rem;">
            🩺 Guided Companion • Twi & English
          </span>
          <button class="speaker-btn btn-read-welcome" data-text="Akwaaba! I am your health companion. Ask me questions about maternal care, infant feeding, or herbal safety." data-lang="english">
            🔊 Read Aloud
          </button>
        </div>
        <strong>English:</strong> Akwaaba! I am your health companion. Ask me questions about maternal care, infant feeding, or herbal safety.<br><br>
        <strong>Twi:</strong> Akwaaba! Me ne wo ho apɔmuden boafoɔ. Bisa me nyinsɛn mu aduane, abofra hwɛ, ne herbal tea ho asem nyinaa.
      </div>
    `;
  },

  bindEvents(container, state, onNavigate, api) {
    const chatInput = container.querySelector('#chat-input');
    const sendBtn = container.querySelector('#btn-send-chat');
    const micBtn = container.querySelector('#btn-mic-chat');
    const messagesArea = container.querySelector('#chat-messages');
    const voiceWave = container.querySelector('#chat-voice-wave');

    const femaleBtn = container.querySelector('#btn-gender-female');
    const maleBtn = container.querySelector('#btn-gender-male');
    const testSampleBtn = container.querySelector('#btn-test-voice-sample');

    // Bind Voice Gender Buttons
    femaleBtn?.addEventListener('click', () => {
      SpeechService.voiceGender = 'female';
      state.voiceGender = 'female';
      femaleBtn.style.background = 'rgba(236, 72, 153, 0.2)';
      femaleBtn.style.borderColor = '#ec4899';
      femaleBtn.style.color = '#f472b6';

      maleBtn.style.background = '';
      maleBtn.style.borderColor = '';
      maleBtn.style.color = '';

      updateHeaderVoiceGenderBtn();
      SpeechService.speak(state.language === 'twi' ? 'Akwaaba! Me yɛ ɔbea apo-mu-den boafoɔ.' : 'Akwaaba! I am your female health companion voice.', state.language, null, testSampleBtn);
    });

    maleBtn?.addEventListener('click', () => {
      SpeechService.voiceGender = 'male';
      state.voiceGender = 'male';
      maleBtn.style.background = 'rgba(59, 130, 246, 0.2)';
      maleBtn.style.borderColor = '#3b82f6';
      maleBtn.style.color = '#60a5fa';

      femaleBtn.style.background = '';
      femaleBtn.style.borderColor = '';
      femaleBtn.style.color = '';

      updateHeaderVoiceGenderBtn();
      SpeechService.speak(state.language === 'twi' ? 'Akwaaba! Me yɛ ɔbarima apo-mu-den boafoɔ.' : 'Akwaaba! I am your male health companion voice.', state.language, null, testSampleBtn);
    });

    testSampleBtn?.addEventListener('click', () => {
      const isTwi = state.language === 'twi';
      const sampleText = isTwi
        ? 'Akwaaba! Mo ho ye. Bisa me apo-mu-den ho asem nyinaa.'
        : 'Akwaaba! Hello, I am your natural health companion voice. How can I help you today?';
      SpeechService.speak(sampleText, isTwi ? 'twi' : 'english', null, testSampleBtn);
    });

    function updateHeaderVoiceGenderBtn() {
      const headerBtn = document.getElementById('btn-toggle-voice-gender');
      if (headerBtn) {
        if (SpeechService.voiceGender === 'female') {
          headerBtn.innerHTML = '👩 Female Voice';
          headerBtn.style.color = '#f472b6';
          headerBtn.style.borderColor = 'rgba(236, 72, 153, 0.4)';
        } else {
          headerBtn.innerHTML = '👨 Male Voice';
          headerBtn.style.color = '#60a5fa';
          headerBtn.style.borderColor = 'rgba(59, 130, 246, 0.4)';
        }
      }
    }

    // Bind welcome message read-aloud buttons
    container.querySelectorAll('.btn-read-welcome').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-text');
        const lang = btn.getAttribute('data-lang');
        SpeechService.speak(text, lang, null, btn);
      });
    });

    // Voice recording setup with Khaya ASR & MedASR-Ghana integration
    let isRecordingAudio = false;

    micBtn?.addEventListener('click', async () => {
      if (SpeechService.isSpeaking()) {
        SpeechService.stop();
      }

      if (!isRecordingAudio) {
        isRecordingAudio = true;
        micBtn.style.background = 'var(--danger)';
        micBtn.style.borderColor = 'var(--danger)';
        chatInput.placeholder = '🎙️ Recording Ghanaian Voice (Abena AI Speech Recognition)... Speak now';
        if (voiceWave) voiceWave.style.display = 'flex';

        const lang = state.language === 'twi' ? 'tw' : 'en';
        await SpeechService.startRecording(lang, (transcription) => {
          chatInput.value = transcription;
          isRecordingAudio = false;
          micBtn.style.background = '';
          micBtn.style.borderColor = '';
          chatInput.placeholder = 'Type or speak your health question in Twi or Simple English...';
          if (voiceWave) voiceWave.style.display = 'none';
          if (transcription && transcription.trim()) {
            handleSend(transcription.trim(), true);
          }
        }, (err) => {
          console.warn('[ChatView] Voice recording notice:', err);
          isRecordingAudio = false;
          micBtn.style.background = '';
          micBtn.style.borderColor = '';
          chatInput.placeholder = 'Type or speak your health question in Twi or Simple English...';
          if (voiceWave) voiceWave.style.display = 'none';
        });
      } else {
        SpeechService.stopRecording();
        isRecordingAudio = false;
        micBtn.style.background = '';
        micBtn.style.borderColor = '';
        chatInput.placeholder = 'Type or speak your health question in Twi or Simple English...';
        if (voiceWave) voiceWave.style.display = 'none';
        if (chatInput.value.trim()) {
          handleSend(chatInput.value.trim(), true);
        }
      }
    });

    const renderAiContent = (data) => {
      const mode = state.language;
      if (mode === 'twi') {
        return `
          <div style="background: rgba(16, 185, 129, 0.08); padding: 0.85rem; border-radius: 8px; border-left: 3px solid var(--primary);">
            <strong style="color: var(--primary);">Twi (Akan):</strong><br>${data.answerTwi}
          </div>
        `;
      }
      if (mode === 'english') {
        return `
          <div style="margin-bottom: 0.5rem;">
            <strong style="color: var(--primary);">Simple English:</strong><br>${data.answerEnglish}
          </div>
        `;
      }
      return `
        <div style="margin-bottom: 0.75rem;">
          <strong>Simple English:</strong><br>${data.answerEnglish}
        </div>
        <div style="background: rgba(16, 185, 129, 0.08); padding: 0.75rem; border-radius: 8px; border-left: 3px solid var(--primary);">
          <strong>Twi (Akan):</strong><br>${data.answerTwi}
        </div>
      `;
    };

    const handleSend = async (queryText, isVoiceTriggered = false) => {
      const text = queryText || chatInput.value.trim();
      if (!text) return;

      // Stop any active TTS audio playback when user sends a new question
      SpeechService.stop();

      state.pendingQuery = '';
      chatInput.value = '';

      // Check if user's question is in Twi or English
      const isSpokenTwi = SpeechService.detectTwiLanguage(text) || state.language === 'twi';

      // User Message Bubble
      const userBubble = document.createElement('div');
      userBubble.style.cssText = 'align-self: flex-end; max-width: 80%; background: rgba(16, 185, 129, 0.2); border: 1px solid var(--primary); padding: 0.85rem; border-radius: 12px; font-size: 0.9rem; margin-top: 0.5rem;';
      userBubble.innerHTML = `<strong>You ${isVoiceTriggered ? '(🎙️ Voice)' : ''}:</strong> ${text}`;
      messagesArea.appendChild(userBubble);
      messagesArea.scrollTop = messagesArea.scrollHeight;

      // Loading Indicator with 3 rippling dots animation
      const loadingBubble = document.createElement('div');
      loadingBubble.className = 'dots-ripple-container';
      loadingBubble.style.cssText = 'align-self: flex-start; margin-top: 0.5rem;';
      loadingBubble.innerHTML = `
        <div class="dots-ripple">
          <span></span>
          <span></span>
          <span></span>
        </div>
      `;
      messagesArea.appendChild(loadingBubble);

      const res = await api.askChatbot({ query: text, language: isSpokenTwi ? 'twi' : state.language });
      messagesArea.removeChild(loadingBubble);

      // AI Response Bubble
      const aiBubble = document.createElement('div');
      aiBubble.style.cssText = 'align-self: flex-start; width: 88%; background: rgba(22, 30, 49, 0.9); border: 1px solid var(--border-card); padding: 1rem; border-radius: 12px; font-size: 0.9rem;';

      if (res.success && res.data) {
        const speakLang = isSpokenTwi ? 'twi' : 'english';
        const textToRead = isSpokenTwi ? res.data.answerTwi : res.data.answerEnglish;

        aiBubble.innerHTML = `
          <div style="font-weight: 600; color: var(--primary); font-size: 0.8rem; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.4rem;">
            <span>🩺 Guided Companion [${res.data.matchedCategory || 'Wellness'}]</span>
            <button class="speaker-btn btn-ai-speak" data-lang="${speakLang}">
              🔊 Read Aloud (${SpeechService.voiceGender === 'female' ? '👩 Female' : '👨 Male'})
            </button>
          </div>
          ${renderAiContent(res.data)}
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem; font-style: italic;">
            ⚠️ ${res.data.disclaimer}
          </div>
          <div class="ai-tech-badges">
            <span class="badge-chip hf">🤖 Gemini & Groq Medical AI</span>
            <span class="badge-chip medasr">🎙️ Abena AI (Twi Voice & ASR)</span>
          </div>
        `;

        const speakerBtn = aiBubble.querySelector('.btn-ai-speak');
        speakerBtn.addEventListener('click', () => {
          SpeechService.speak(textToRead, speakLang, null, speakerBtn);
        });

        // Automatically speak the response back out loud if autoSpeak is enabled or voice triggered
        if (SpeechService.autoSpeak || isVoiceTriggered) {
          setTimeout(() => {
            SpeechService.speak(textToRead, speakLang, null, speakerBtn);
          }, 300);
        }
      } else {
        aiBubble.innerHTML = `<span style="color: var(--danger);">Error retrieving response. Operating in local mode.</span>`;
      }

      messagesArea.appendChild(aiBubble);
      messagesArea.scrollTop = messagesArea.scrollHeight;
    };

    sendBtn?.addEventListener('click', () => handleSend());
    chatInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSend();
    });

    container.querySelectorAll('.chip-preset').forEach(chip => {
      chip.addEventListener('click', () => {
        const query = chip.getAttribute('data-query');
        handleSend(query);
      });
    });

    // Load persistent chat history from backend SQLite database & localStorage
    (async () => {
      const currentUserId = state.userId || 'demo-patient-001';
      let historyItems = [];

      try {
        if (api && api.getChatHistory) {
          const historyRes = await api.getChatHistory(currentUserId);
          if (historyRes.success && historyRes.data && historyRes.data.length > 0) {
            historyItems = historyRes.data;
            try {
              localStorage.setItem('lily_chat_history_' + currentUserId, JSON.stringify(historyItems));
            } catch (e) {}
          }
        }
      } catch (e) {
        console.warn('[ChatView] History fetch notice, checking local cache:', e);
      }

      if (historyItems.length === 0) {
        try {
          const cached = localStorage.getItem('lily_chat_history_' + currentUserId);
          if (cached) historyItems = JSON.parse(cached);
        } catch (e) {}
      }

      if (historyItems && historyItems.length > 0) {
        for (const item of historyItems) {
          const userBubble = document.createElement('div');
          userBubble.style.cssText = 'align-self: flex-end; max-width: 80%; background: rgba(16, 185, 129, 0.2); border: 1px solid var(--primary); padding: 0.85rem; border-radius: 12px; font-size: 0.9rem; margin-top: 0.5rem;';
          userBubble.innerHTML = `<strong>You:</strong> ${item.user_query}`;
          messagesArea.appendChild(userBubble);

          const aiBubble = document.createElement('div');
          aiBubble.style.cssText = 'align-self: flex-start; width: 88%; background: rgba(22, 30, 49, 0.9); border: 1px solid var(--border-card); padding: 1rem; border-radius: 12px; font-size: 0.9rem; margin-bottom: 0.5rem;';
          const speakLang = state.language === 'twi' ? 'twi' : 'english';
          const textToRead = state.language === 'twi' ? (item.answer_twi || item.answerTwi) : (item.answer_english || item.answerEnglish);

          aiBubble.innerHTML = `
            <div style="font-weight: 600; color: var(--primary); font-size: 0.8rem; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
              <span>🩺 Guided Companion [${item.category || item.matchedCategory || 'Wellness'}]</span>
              <button class="speaker-btn btn-ai-speak">
                🔊 Read Aloud
              </button>
            </div>
            ${renderAiContent({ answerEnglish: item.answer_english || item.answerEnglish, answerTwi: item.answer_twi || item.answerTwi })}
          `;

          const speakerBtn = aiBubble.querySelector('.btn-ai-speak');
          speakerBtn?.addEventListener('click', () => {
            SpeechService.speak(textToRead, speakLang, null, speakerBtn);
          });

          messagesArea.appendChild(aiBubble);
        }
        messagesArea.scrollTop = messagesArea.scrollHeight;
      }
    })();

    // Auto-trigger pending query if coming from Dashboard
    if (state.pendingQuery) {
      const q = state.pendingQuery;
      state.pendingQuery = '';
      handleSend(q, true);
    }
  }
};
