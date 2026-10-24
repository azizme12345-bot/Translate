/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';

const LANG_VOICE_MAP: Record<string, string> = {
  Urdu: 'ur-PK',
  English: 'en-US',
  Arabic: 'ar-SA',
  Chinese: 'zh-CN',
  Korean: 'ko-KR',
  Hindi: 'hi-IN',
  Punjabi: 'pa-IN',
  French: 'fr-FR',
  Spanish: 'es-ES',
  German: 'de-DE',
  Japanese: 'ja-JP',
  Turkish: 'tr-TR',
};

const DEFAULT_OUTPUT = 'ترجمہ یہاں ظاہر ہوگا...';

export default function App() {
  const [activeTab, setActiveTab] = useState<'text' | 'voice' | 'image'>('text');
  const [sourceLang, setSourceLang] = useState<string>('English');
  const [targetLang, setTargetLang] = useState<string>('Urdu');
  const [inputText, setInputText] = useState<string>('');
  const [outputText, setOutputText] = useState<string>(DEFAULT_OUTPUT);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string>('');
  const [showToast, setShowToast] = useState<boolean>(false);
  const [showAllTools, setShowAllTools] = useState<boolean>(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/jpeg');
  const [activeNav, setActiveNav] = useState<string>('home');

  // Real-time microphone recording states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [interimText, setInterimText] = useState<string>('');

  // Speech playback states
  const [speakingTarget, setSpeakingTarget] = useState<'input' | 'output' | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalTitle, setModalTitle] = useState<string>('Preview tool');
  const [modalText, setModalText] = useState<string>('This tool will be available soon.');
  const [modalActionText, setModalActionText] = useState<string>('OK');
  const [modalTool, setModalTool] = useState<string | null>(null);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inputTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Recognition references for real-time word-by-word streaming
  const recognitionRef = useRef<any>(null);
  const baseTextRef = useRef<string>('');
  const finalAccumulatedRef = useRef<string>('');

  const displayToast = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setShowToast(false);
    }, 2800);
  };

  const openModal = (title: string, desc: string, action = 'OK', tool: string | null = null) => {
    setModalTitle(title);
    setModalText(desc);
    setModalActionText(action);
    setModalTool(tool);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalTool(null);
  };

  // Stop listening/recording when component unmounts
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // REAL-TIME INSTANT STREAMING SPEECH-TO-TEXT (Word by Word)
  const toggleLiveVoiceTyping = () => {
    if (isRecording) {
      // User clicked mic to STOP
      stopVoiceRecording();
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      displayToast(
        'آپ کا براؤزر وائس ٹائپنگ کو سپورٹ نہیں کرتا۔ برائے مہربانی Google Chrome استعمال کریں۔'
      );
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = LANG_VOICE_MAP[sourceLang] || 'ur-PK';

      // Base text before this recording session
      baseTextRef.current = inputText.trim();
      finalAccumulatedRef.current = '';
      setInterimText('');

      recognition.onstart = () => {
        setIsRecording(true);
        displayToast('🎙 مائیک چالو ہے! بولیں، الفاظ فوری لکھے جائیں گے...');
      };

      // LIVE REAL-TIME WORD-BY-WORD TRANSCRIPTION
      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let currentFinalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          const transcript = item[0].transcript;

          if (item.isFinal) {
            currentFinalChunk += transcript;
          } else {
            currentInterim += transcript;
          }
        }

        if (currentFinalChunk) {
          finalAccumulatedRef.current +=
            (finalAccumulatedRef.current ? ' ' : '') + currentFinalChunk.trim();
        }

        setInterimText(currentInterim);

        // Instant text composition: Base + Final accumulated + Live interim spoken words
        const allSpokenSoFar = (
          finalAccumulatedRef.current +
          (currentInterim ? ' ' + currentInterim : '')
        ).trim();

        const fullUpdatedText = baseTextRef.current
          ? `${baseTextRef.current} ${allSpokenSoFar}`
          : allSpokenSoFar;

        setInputText(fullUpdatedText);

        // Auto-scroll textarea to end so user sees words as they are spoken
        if (inputTextareaRef.current) {
          inputTextareaRef.current.scrollTop = inputTextareaRef.current.scrollHeight;
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition status:', e?.error);
        if (e?.error === 'not-allowed') {
          displayToast('مائیکروفون کی اجازت نہیں ملی۔ براؤزر کی سیٹنگز چیک کریں۔');
        } else if (e?.error !== 'no-speech') {
          displayToast('مائیکروفون ایرر: ' + (e?.error || 'دوبارہ کوشش کریں'));
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
        setInterimText('');
      };

      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setIsRecording(false);
      displayToast('مائیک شروع کرنے میں خرابی ہوئی۔');
    }
  };

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsRecording(false);
    setInterimText('');
    displayToast('وائس ٹائپنگ بند کر دی گئی۔');
  };

  // FULLY WORKABLE TEXT-TO-SPEECH (Listening Option)
  const speak = (textToSpeak: string, langName: string, targetType: 'input' | 'output') => {
    const text = textToSpeak.trim();
    if (!text || text === DEFAULT_OUTPUT) {
      displayToast('سننے کے لیے کوئی تحریر موجود نہیں ہے۔ (No text to listen to)');
      return;
    }

    if (!('speechSynthesis' in window)) {
      displayToast('آپ کے براؤزر میں آواز کی سہولت موجود نہیں ہے۔ (Text-to-speech not supported)');
      return;
    }

    // Toggle: if currently speaking this target, stop playback
    if (window.speechSynthesis.speaking && speakingTarget === targetType) {
      window.speechSynthesis.cancel();
      setSpeakingTarget(null);
      displayToast('آواز بند کر دی گئی۔');
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const bcp47 = LANG_VOICE_MAP[langName] || 'ur-PK';
      utterance.lang = bcp47;
      utterance.rate = 0.95;

      // Match system voice if available
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const matched = voices.find(
          (v) => v.lang === bcp47 || v.lang.startsWith(bcp47.slice(0, 2))
        );
        if (matched) {
          utterance.voice = matched;
        }
      }

      utterance.onstart = () => {
        setSpeakingTarget(targetType);
        displayToast(`🔊 سن رہے ہیں (${langName})...`);
      };

      utterance.onend = () => {
        setSpeakingTarget(null);
      };

      utterance.onerror = () => {
        setSpeakingTarget(null);
        displayToast('آواز چلانے میں رکاوٹ آئی۔');
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      setSpeakingTarget(null);
      displayToast('آواز چلانے میں مسئلہ ہوا۔');
    }
  };

  // Copy to clipboard
  const copyContent = (textToCopy: string) => {
    const text = textToCopy.trim();
    if (!text || text === DEFAULT_OUTPUT) {
      displayToast('کاپی کرنے کے لیے کوئی ترجمہ موجود نہیں ہے۔');
      return;
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(text)
        .then(() => displayToast('کلپ بورڈ پر کاپی ہو گیا!'))
        .catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text: string) => {
    const t = document.createElement('textarea');
    t.value = text;
    t.style.position = 'fixed';
    t.style.opacity = '0';
    document.body.appendChild(t);
    t.select();
    try {
      document.execCommand('copy');
      displayToast('کلپ بورڈ پر کاپی ہو گیا!');
    } catch {
      displayToast('متن منتخب کر کے خود کاپی کریں۔');
    }
    t.remove();
  };

  // Swap Languages and Texts
  const handleSwap = () => {
    const oldSource = sourceLang;
    const oldTarget = targetLang;
    setSourceLang(oldTarget);
    setTargetLang(oldSource);

    const currentOutput = outputText.trim();
    const currentInput = inputText.trim();

    if (currentOutput && currentOutput !== DEFAULT_OUTPUT) {
      setInputText(currentOutput);
      setOutputText(currentInput || DEFAULT_OUTPUT);
    } else if (currentInput) {
      setOutputText(currentInput);
      setInputText('');
    }

    displayToast('زبانیں تبدیل کر دی گئیں (Swapped).');
  };

  // Clear Input Text
  const handleClear = () => {
    if (isRecording) {
      stopVoiceRecording();
    }
    setInputText('');
    setInterimText('');
    inputTextareaRef.current?.focus();
    displayToast('متن صاف کر دیا گیا۔');
  };

  // Translation via Gemini API backend (/api/translate - Cloudflare Pages & Express)
  const handleTranslate = async () => {
    if (isRecording) {
      stopVoiceRecording();
    }

    if (activeTab === 'image') {
      if (!imageBase64) {
        displayToast('برائے مہربانی پہلے تصویر منتخب کریں۔');
        return;
      }
    } else {
      if (!inputText.trim()) {
        displayToast('برائے مہربانی ترجمے کے لیے متن لکھیں یا بولیں۔');
        inputTextareaRef.current?.focus();
        return;
      }
    }

    setIsLoading(true);
    const prevOutput = outputText;
    setOutputText('ترجمہ کیا جا رہا ہے (Gemini)...');

    try {
      const payload: Record<string, any> = {
        sourceLang,
        targetLang,
      };

      if (activeTab === 'image' && imageBase64) {
        payload.imageBase64 = imageBase64;
        payload.mimeType = imageMime;
      } else {
        payload.text = inputText.trim();
      }

      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || `Translation error (${res.status})`);
      }

      if (data.translatedText) {
        setOutputText(data.translatedText);
        displayToast('ترجمہ مکمل ہو گیا!');
      } else {
        setOutputText('کوئی ترجمہ حاصل نہیں ہو سکا۔');
      }
    } catch (err: any) {
      console.error('Translate request failed:', err);
      setOutputText(prevOutput !== DEFAULT_OUTPUT ? prevOutput : DEFAULT_OUTPUT);
      displayToast(err.message || 'ترجمہ کرنے میں ناکامی۔ انٹرنیٹ اور کی چیک کریں۔');
    } finally {
      setIsLoading(false);
    }
  };

  // Image file handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      displayToast('صرف تصویر والی فائل منتخب کریں۔');
      return;
    }

    setImageMime(file.type);
    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImageBase64(base64);
      displayToast('تصویر لوڈ ہو گئی۔ اب "Translate Image" کا بٹن دبائیں۔');
    };
    reader.readAsDataURL(file);
  };

  // Share functionality
  const handleShare = async () => {
    const textToShare =
      outputText && outputText !== DEFAULT_OUTPUT
        ? outputText
        : 'Language Translator: Translate your words, voice and images with Gemini AI!';

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Language Translator',
          text: textToShare,
        });
      } else {
        copyContent(textToShare);
      }
    } catch {
      // User cancelled share
    }
  };

  // Tool handling
  const handleToolClick = (toolName: string) => {
    if (
      toolName === 'Text Case Converter' ||
      toolName === 'Text Counter' ||
      toolName === 'Text Formatter'
    ) {
      openModal(
        toolName,
        'باکس میں موجود متن پر فوری عمل کریں۔ یہ یوٹیلٹی آپ کے متن پر براہ راست اثر کرتی ہے۔',
        'Apply tool',
        toolName
      );
    } else if (toolName === 'Urdu ↔ English Typing') {
      setSourceLang('Urdu');
      setTargetLang('English');
      scrollToSection('translator');
      displayToast('اردو سے انگریزی ٹائپنگ موڈ سیٹ کر دیا گیا۔');
    } else if (toolName === 'Image to Text (OCR)') {
      setActiveTab('image');
      scrollToSection('translator');
      displayToast('تصویر موڈ فعال ہے۔ تصویر اپ لوڈ کر کے ترجمہ کریں۔');
    } else if (toolName === 'Voice Translation') {
      setActiveTab('voice');
      scrollToSection('translator');
      displayToast('وائس موڈ فعال ہے۔ مائیک دبا کر بولیں۔');
    } else {
      openModal(
        toolName,
        `${toolName} کا فیچر اس ورژن میں فعال ہے۔ ترجمہ کے لیے زبانیں منتخب کریں۔`,
        'OK',
        null
      );
    }
  };

  const handleModalAction = () => {
    if (modalTool) {
      let v = inputText;
      if (modalTool === 'Text Case Converter') {
        v = v.toUpperCase();
        setInputText(v);
        displayToast('انگریزی حروف بڑے (UPPERCASE) کر دیے گئے۔');
      } else if (modalTool === 'Text Counter') {
        const words = v.trim() ? v.trim().split(/\s+/).length : 0;
        displayToast(`الفاظ: ${words} · حروف: ${v.length}`);
        closeModal();
        return;
      } else if (modalTool === 'Text Formatter') {
        v = v.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
        setInputText(v);
        displayToast('اضافی فاصلے اور خالی لائنیں صاف کر دی گئیں۔');
      }
    } else if (modalActionText === 'Open translator' || modalActionText === 'Open tools') {
      scrollToSection(modalActionText === 'Open tools' ? 'tools' : 'translator');
    }
    closeModal();
  };

  const scrollToSection = (id: string) => {
    setActiveNav(id === 'home' ? 'home' : id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="app" id="home">
      {/* Top Bar */}
      <header className="topbar">
        <div className="logo" aria-hidden="true">
          A文
        </div>
        <div className="brand">
          <strong>Language Translator</strong>
          <span>Translate · Type · Listen · Connect</span>
        </div>
        <button
          className="menu"
          id="menuBtn"
          aria-label="Open menu"
          onClick={() =>
            openModal(
              'Language Translator',
              'گوگل جیمنائی (Gemini AI) سے لیس تیز ترین اور درست ترجمہ ایپ۔ نیچے سے ٹولز یا موڈز کا انتخاب کریں۔',
              'Open tools'
            )
          }
        >
          ☰
        </button>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <h1>Break Language Barriers</h1>
        <p>Translate your words, voice and images between multiple languages.</p>
        <div className="chips">
          <span className="chip">⚡ Fast (Gemini Lite)</span>
          <span className="chip">◆ Live Voice Mic</span>
          <span className="chip">◎ 100+ Languages</span>
        </div>
        <div className="globe" aria-hidden="true"></div>
        <span className="bubble b1">Hello</span>
        <span className="bubble b2">سلام</span>
        <span className="bubble b3">你好</span>
      </section>

      <main>
        {/* Main Translator Card */}
        <section className="translator" id="translator">
          {/* Mode Tabs */}
          <div className="tabs" role="tablist">
            <button
              className={`tab ${activeTab === 'text' ? 'active' : ''}`}
              data-tab="text"
              onClick={() => setActiveTab('text')}
            >
              ▤ Text
            </button>
            <button
              className={`tab ${activeTab === 'voice' ? 'active' : ''}`}
              data-tab="voice"
              onClick={() => {
                setActiveTab('voice');
                displayToast('وائس موڈ: مائیک دبا کر بولیں، لائیو لکھا جائے گا!');
              }}
            >
              ♩ Voice
            </button>
            <button
              className={`tab ${activeTab === 'image' ? 'active' : ''}`}
              data-tab="image"
              onClick={() => {
                setActiveTab('image');
                displayToast('تصویر موڈ: فوٹو اپ لوڈ کریں اور متن کا ترجمہ کروائیں!');
              }}
            >
              ▧ Image
            </button>
          </div>

          {/* Languages Selector */}
          <div className="languages">
            <select
              className="lang"
              id="sourceLang"
              aria-label="Source language"
              value={sourceLang}
              onChange={(e) => {
                setSourceLang(e.target.value);
                if (isRecording) stopVoiceRecording();
              }}
            >
              <option value="Urdu">🇵🇰 Urdu</option>
              <option value="English">🇬🇧 English</option>
              <option value="Arabic">🇸🇦 Arabic</option>
              <option value="Chinese">🇨🇳 Chinese</option>
              <option value="Korean">🇰🇷 Korean</option>
              <option value="Hindi">🇮🇳 Hindi</option>
              <option value="Punjabi">🟢 Punjabi</option>
              <option value="French">🇫🇷 French</option>
              <option value="Spanish">🇪🇸 Spanish</option>
              <option value="German">🇩🇪 German</option>
              <option value="Japanese">🇯🇵 Japanese</option>
              <option value="Turkish">🇹🇷 Turkish</option>
            </select>

            <button
              className="swap"
              id="swapBtn"
              aria-label="Swap languages"
              title="Swap languages"
              onClick={handleSwap}
            >
              ⇄
            </button>

            <select
              className="lang"
              id="targetLang"
              aria-label="Target language"
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
            >
              <option value="English">🇬🇧 English</option>
              <option value="Urdu">🇵🇰 Urdu</option>
              <option value="Arabic">🇸🇦 Arabic</option>
              <option value="Chinese">🇨🇳 Chinese</option>
              <option value="Korean">🇰🇷 Korean</option>
              <option value="Hindi">🇮🇳 Hindi</option>
              <option value="Punjabi">🟢 Punjabi</option>
              <option value="French">🇫🇷 French</option>
              <option value="Spanish">🇪🇸 Spanish</option>
              <option value="German">🇩🇪 German</option>
              <option value="Japanese">🇯🇵 Japanese</option>
              <option value="Turkish">🇹🇷 Turkish</option>
            </select>
          </div>

          {/* Text Input Mode */}
          <div id="textMode" className={activeTab === 'text' ? '' : 'hidden'}>
            <div className="pane">
              <textarea
                ref={inputTextareaRef}
                id="inputText"
                maxLength={5000}
                placeholder="یہاں لکھیں یا مائیک کا بٹن دبا کر بولیں..."
                aria-label="Text to translate"
                dir="auto"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              ></textarea>
              <div className="panefoot">
                <span id="count">{inputText.length}/5000</span>
                {isRecording && (
                  <span className="live-indicator">
                    <span className="live-dot"></span>
                    <span>لائیو بولیں...</span>
                  </span>
                )}
                <span className="spacer"></span>
                <button
                  className={`iconbtn ${isRecording ? 'recording' : ''}`}
                  id="micBtn"
                  aria-label="Voice typing"
                  title={isRecording ? 'مائیک بند کریں' : 'بول کر ٹائپ کریں (مائیک)'}
                  onClick={toggleLiveVoiceTyping}
                >
                  🎙
                </button>
                <button
                  className={`iconbtn ${speakingTarget === 'input' ? 'speaking' : ''}`}
                  id="listenInput"
                  aria-label="Listen to input"
                  title="سنیں (Listen)"
                  onClick={() => speak(inputText, sourceLang, 'input')}
                >
                  🔊
                </button>
                <button
                  className="iconbtn"
                  id="clearBtn"
                  aria-label="Clear text"
                  title="صاف کریں (Clear)"
                  onClick={handleClear}
                >
                  ⊗
                </button>
              </div>
            </div>
          </div>

          {/* Image Mode */}
          <div id="imageMode" className={activeTab === 'image' ? '' : 'hidden'}>
            <label
              className="toolcard"
              style={{ width: '100%', alignItems: 'center', minHeight: '90px', cursor: 'pointer' }}
              htmlFor="imageFile"
            >
              <span className="toolicon qblue">▧</span>
              <span>
                <strong>{imageBase64 ? 'تصویر تبدیل کریں (Change Image)' : 'تصویر منتخب کریں (Choose Image)'}</strong>
                <small>
                  {imageBase64
                    ? 'تصویر منتخب ہو چکی ہے۔ اب نیچے Translate کا بٹن دبائیں۔'
                    : 'کسی بھی فوٹو، دستاویز یا سکرین شاٹ کا متن ترجمہ کروائیں۔'}
                </small>
              </span>
            </label>
            <input
              ref={fileInputRef}
              id="imageFile"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            {imagePreviewUrl && (
              <div id="imagePreview" style={{ marginTop: '10px' }}>
                <img
                  src={imagePreviewUrl}
                  alt="Selected preview"
                  style={{
                    display: 'block',
                    maxWidth: '100%',
                    maxHeight: '260px',
                    margin: 'auto',
                    borderRadius: '14px',
                    border: '1px solid #dce9fa',
                  }}
                />
              </div>
            )}
          </div>

          {/* Voice Mode */}
          <div id="voiceMode" className={activeTab === 'voice' ? '' : 'hidden'}>
            <div className="output" style={{ minHeight: '130px', textAlign: 'center', justifyContent: 'center' }}>
              <div
                className="output-text"
                dir="auto"
                style={{
                  color: inputText ? 'var(--ink)' : undefined,
                  fontSize: '17px',
                  fontWeight: inputText ? 600 : 400,
                  marginBottom: '10px',
                }}
              >
                {inputText ? (
                  <>
                    <span>{inputText}</span>
                    {interimText && <span style={{ opacity: 0.6 }}> {interimText}</span>}
                  </>
                ) : (
                  'مائیکروفون پر کلک کریں اور بولنا شروع کریں۔ جیسے جیسے آپ بولیں گے، الفاظ لائیو لکھتے جائیں گے!'
                )}
              </div>
              <div className="output-tools" style={{ justifyContent: 'center', gap: '15px' }}>
                <button
                  className={`iconbtn ${isRecording ? 'recording' : ''}`}
                  id="voiceStart"
                  aria-label="Start microphone"
                  style={{ width: '48px', height: '48px', fontSize: '26px' }}
                  onClick={toggleLiveVoiceTyping}
                  title={isRecording ? 'مائیک بند کریں' : 'مائیک چالو کریں'}
                >
                  🎙
                </button>
                {inputText && (
                  <button
                    className={`iconbtn ${speakingTarget === 'input' ? 'speaking' : ''}`}
                    onClick={() => speak(inputText, sourceLang, 'input')}
                    title="بول کر سنیں"
                    style={{ width: '48px', height: '48px', fontSize: '22px' }}
                  >
                    🔊
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Output Box */}
          <div className="output" id="outputBox">
            <div
              className={`output-text ${outputText !== DEFAULT_OUTPUT ? 'has-content' : ''}`}
              id="outputText"
              dir="auto"
            >
              {outputText}
            </div>
            <div className="output-tools">
              <button
                className={`iconbtn ${speakingTarget === 'output' ? 'speaking' : ''}`}
                id="listenOutput"
                aria-label="Listen to result"
                title="ترجمہ سنیں (Listen)"
                onClick={() => speak(outputText, targetLang, 'output')}
              >
                🔊
              </button>
              <button
                className="iconbtn"
                id="copyBtn"
                aria-label="Copy result"
                title="کاپی کریں (Copy)"
                onClick={() => copyContent(outputText)}
              >
                ▢
              </button>
              <button
                className="iconbtn"
                id="shareBtn"
                aria-label="Share"
                title="شیئر کریں (Share)"
                onClick={handleShare}
              >
                ♧
              </button>
            </div>
          </div>

          {/* Translate Button */}
          <button
            className="translate"
            id="translateBtn"
            disabled={isLoading}
            onClick={handleTranslate}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                <span>ترجمہ ہو رہا ہے...</span>
              </>
            ) : (
              <>
                <span>➤</span>
                <span>
                  {activeTab === 'image'
                    ? 'Translate Image'
                    : activeTab === 'voice'
                    ? 'Translate Voice Text'
                    : 'Translate'}
                </span>
              </>
            )}
          </button>
          <p className="notice">Powered by Gemini AI · Fast, secure neural translation.</p>
        </section>

        {/* Quick Tools */}
        <section className="quick" aria-label="Quick tools">
          <button
            data-open="voice"
            onClick={() => {
              setActiveTab('voice');
              scrollToSection('translator');
            }}
          >
            <span className="qicon qgreen">🎙</span>
            <span>
              Voice
              <br />
              Translation
            </span>
          </button>
          <button
            data-open="image"
            onClick={() => {
              setActiveTab('image');
              scrollToSection('translator');
            }}
          >
            <span className="qicon qpurple">📷</span>
            <span>
              Image
              <br />
              Translation
            </span>
          </button>
          <button data-tool="PDF Tools" onClick={() => handleToolClick('PDF Tools')}>
            <span className="qicon qred">▣</span>
            <span>
              PDF
              <br />
              Tools
            </span>
          </button>
          <button data-tool="Text Tools" onClick={() => handleToolClick('Text Formatter')}>
            <span className="qicon qblue">⌨</span>
            <span>
              Text
              <br />
              Tools
            </span>
          </button>
        </section>

        {/* Tools Grid Section */}
        <section className="section" id="tools">
          <div className="sectionhead">
            <h2>Useful Tools for You</h2>
            <button
              className="textlink"
              id="viewAll"
              onClick={() => setShowAllTools(!showAllTools)}
            >
              {showAllTools ? 'Show fewer ↑' : 'View all tools →'}
            </button>
          </div>
          <div className="toolsgrid" id="toolsGrid">
            <button
              className="toolcard"
              data-tool="Urdu ↔ English Typing"
              onClick={() => handleToolClick('Urdu ↔ English Typing')}
            >
              <span className="toolicon qpurple">⌨</span>
              <span>
                <strong>Urdu ↔ English Typing</strong>
                <small>Type in Urdu or English with ease</small>
              </span>
              <span className="arrow">›</span>
            </button>
            <button
              className="toolcard"
              data-tool="Text to Image"
              onClick={() => handleToolClick('Text to Image')}
            >
              <span className="toolicon qred">▧</span>
              <span>
                <strong>Text to Image</strong>
                <small>Preview tool — AI image generation</small>
              </span>
              <span className="arrow">›</span>
            </button>
            <button
              className="toolcard"
              data-tool="Image to Text (OCR)"
              onClick={() => handleToolClick('Image to Text (OCR)')}
            >
              <span className="toolicon qblue">A</span>
              <span>
                <strong>Image to Text (OCR)</strong>
                <small>Extract and translate text from images</small>
              </span>
              <span className="arrow">›</span>
            </button>
            <button
              className="toolcard"
              data-tool="PDF Tools"
              onClick={() => handleToolClick('PDF Tools')}
            >
              <span className="toolicon qgreen">▣</span>
              <span>
                <strong>PDF Tools</strong>
                <small>Merge, compress and convert PDF</small>
              </span>
              <span className="arrow">›</span>
            </button>

            {/* Extra Tools */}
            <button
              className={`toolcard extra ${showAllTools ? 'show' : ''}`}
              data-tool="Text Case Converter"
              onClick={() => handleToolClick('Text Case Converter')}
            >
              <span className="toolicon qgreen">Aa</span>
              <span>
                <strong>Text Case Converter</strong>
                <small>UPPERCASE, lowercase and more</small>
              </span>
              <span className="arrow">›</span>
            </button>
            <button
              className={`toolcard extra ${showAllTools ? 'show' : ''}`}
              data-tool="Text Counter"
              onClick={() => handleToolClick('Text Counter')}
            >
              <span className="toolicon qpurple">123</span>
              <span>
                <strong>Word & Character Counter</strong>
                <small>Count words and characters</small>
              </span>
              <span className="arrow">›</span>
            </button>
            <button
              className={`toolcard extra ${showAllTools ? 'show' : ''}`}
              data-tool="Text Formatter"
              onClick={() => handleToolClick('Text Formatter')}
            >
              <span className="toolicon qblue">¶</span>
              <span>
                <strong>Text Formatter</strong>
                <small>Clean extra spaces and lines</small>
              </span>
              <span className="arrow">›</span>
            </button>
            <button
              className={`toolcard extra ${showAllTools ? 'show' : ''}`}
              data-tool="Image Resizer"
              onClick={() => handleToolClick('Image Resizer')}
            >
              <span className="toolicon qred">↔</span>
              <span>
                <strong>Image Resizer</strong>
                <small>Resize pictures for web and social</small>
              </span>
              <span className="arrow">›</span>
            </button>
            <button
              className={`toolcard extra ${showAllTools ? 'show' : ''}`}
              data-tool="JPG to PDF"
              onClick={() => handleToolClick('JPG to PDF')}
            >
              <span className="toolicon qgreen">▤</span>
              <span>
                <strong>JPG to PDF</strong>
                <small>Convert images to PDF</small>
              </span>
              <span className="arrow">›</span>
            </button>
            <button
              className={`toolcard extra ${showAllTools ? 'show' : ''}`}
              data-tool="Language Guide"
              onClick={() => handleToolClick('Language Guide')}
            >
              <span className="toolicon qpurple">◎</span>
              <span>
                <strong>Language Guide</strong>
                <small>Helpful language learning resources</small>
              </span>
              <span className="arrow">›</span>
            </button>
          </div>
        </section>

        {/* Popular Languages Section */}
        <section className="section" id="languages">
          <div className="sectionhead">
            <h2>Popular Languages</h2>
          </div>
          <div className="chips">
            <span
              className="chip"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setSourceLang('Urdu');
                setTargetLang('English');
                scrollToSection('translator');
              }}
            >
              🇵🇰 Urdu
            </span>
            <span
              className="chip"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setSourceLang('English');
                setTargetLang('Urdu');
                scrollToSection('translator');
              }}
            >
              🇬🇧 English
            </span>
            <span
              className="chip"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setTargetLang('Arabic');
                scrollToSection('translator');
              }}
            >
              🇸🇦 Arabic
            </span>
            <span
              className="chip"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setTargetLang('Chinese');
                scrollToSection('translator');
              }}
            >
              🇨🇳 Chinese
            </span>
            <span
              className="chip"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setTargetLang('Korean');
                scrollToSection('translator');
              }}
            >
              🇰🇷 Korean
            </span>
            <span
              className="chip"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setTargetLang('Hindi');
                scrollToSection('translator');
              }}
            >
              🇮🇳 Hindi
            </span>
            <span
              className="chip"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setTargetLang('Punjabi');
                scrollToSection('translator');
              }}
            >
              🟢 Punjabi
            </span>
            <span
              className="chip"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setTargetLang('Japanese');
                scrollToSection('translator');
              }}
            >
              🇯🇵 Japanese
            </span>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer">
          <strong>Language Translator</strong>
          <br />
          Translate · Type · Listen · Connect
          <br />
          <br />
          Powered by Google Gemini API · Cloudflare & Express Ready
        </footer>
      </main>

      {/* Bottom Navigation */}
      <nav className="bottomnav" aria-label="Bottom navigation">
        <button
          className={activeNav === 'home' ? 'active' : ''}
          data-scroll="home"
          onClick={() => scrollToSection('home')}
        >
          <span className="navicon">⌂</span>
          Home
        </button>
        <button
          className={activeNav === 'tools' ? 'active' : ''}
          data-scroll="tools"
          onClick={() => scrollToSection('tools')}
        >
          <span className="navicon">▦</span>
          Tools
        </button>
        <button
          className={activeNav === 'languages' ? 'active' : ''}
          data-scroll="languages"
          onClick={() => scrollToSection('languages')}
        >
          <span className="navicon">◎</span>
          Languages
        </button>
        <button
          id="moreBtn"
          onClick={() =>
            openModal(
              'More options',
              'Language Translator supports over 100+ languages, real-time live microphone streaming, text-to-speech, and image translations powered by Gemini.',
              'Close'
            )
          }
        >
          <span className="navicon">☻</span>
          More
        </button>
      </nav>

      {/* Tool Modal */}
      <div
        className={`modal ${modalOpen ? 'show' : ''}`}
        id="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modalTitle"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeModal();
        }}
      >
        <div className="modalbox">
          <h3 id="modalTitle">{modalTitle}</h3>
          <p id="modalText">{modalText}</p>
          <div id="modalExtra"></div>
          <div style={{ marginTop: '18px', textAlign: 'right' }}>
            <button className="secondary" id="modalClose" onClick={closeModal}>
              Close
            </button>
            <button id="modalAction" onClick={handleModalAction}>
              {modalActionText}
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <div className={`toast ${showToast ? 'show' : ''}`} id="toast" role="status">
        {toastMsg}
      </div>
    </div>
  );
}
