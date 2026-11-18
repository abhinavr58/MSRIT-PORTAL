import { parseDobParts } from './storage';

const MONTH_NAMES = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
];

export function buildPortalAutoFillScript(profile) {
  if (!profile) return 'true;';
  const dob = parseDobParts(profile.dob);
  if (!dob) return 'true;';

  const payload = JSON.stringify({
    usn: profile.usn,
    day: dob.day,
    dayNum: String(parseInt(dob.day, 10)),
    month: dob.month,
    monthNum: String(parseInt(dob.month, 10)),
    monthShort: MONTH_NAMES[parseInt(dob.month, 10) - 1] || '',
    year: dob.year,
    fatherLast4: profile.fatherLast4,
  });

  return `
    (function() {
      const DATA = ${payload};
      if (window.__msritAutoFillDoneForUrl === window.location.href) return;

      function triggerEvents(el) {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }

      function selectMatchingOption(selectEl, candidates) {
        if (!selectEl || !selectEl.options) return false;
        const lowerCandidates = candidates.map((c) => String(c).toLowerCase());
        for (let i = 0; i < selectEl.options.length; i++) {
          const opt = selectEl.options[i];
          const val = (opt.value || '').trim().toLowerCase();
          const txt = (opt.text || '').trim().toLowerCase();
          if (lowerCandidates.includes(val) || lowerCandidates.includes(txt)) {
            selectEl.selectedIndex = i;
            triggerEvents(selectEl);
            return true;
          }
          if (candidates.some((c) => c.length >= 3 && txt.startsWith(String(c).toLowerCase()))) {
            selectEl.selectedIndex = i;
            triggerEvents(selectEl);
            return true;
          }
        }
        return false;
      }

      const bodyText = (document.body && document.body.innerText || '').toLowerCase();

      const usnInput =
        document.querySelector('input[placeholder*="USN" i]') ||
        document.querySelector('input[name*="username" i]') ||
        document.querySelector('input[id*="username" i]');

      const captchaInput =
        document.querySelector('input[placeholder*="5 CHARACTERS" i]') ||
        document.querySelector('input[placeholder*="captcha" i]') ||
        document.querySelector('input[name*="captcha" i]') ||
        document.querySelector('input[id*="captcha" i]');

      if (usnInput) {
        if (!usnInput.value) {
          usnInput.value = DATA.usn;
          triggerEvents(usnInput);
        }

        const selects = Array.from(document.querySelectorAll('select'));
        selects.forEach((sel) => {
          const firstOpt = (sel.options[0]?.text || '').trim().toLowerCase();
          const nameId = ((sel.name || '') + ' ' + (sel.id || '')).toLowerCase();

          if (firstOpt === 'day' || nameId.includes('dd') || nameId.includes('day')) {
            selectMatchingOption(sel, [DATA.day, DATA.dayNum]);
          } else if (firstOpt === 'month' || nameId.includes('mm') || nameId.includes('month')) {
            selectMatchingOption(sel, [DATA.month, DATA.monthNum, DATA.monthShort]);
          } else if (firstOpt === 'year' || nameId.includes('yy') || nameId.includes('year')) {
            selectMatchingOption(sel, [DATA.year]);
          }
        });

        if (captchaInput) {
          captchaInput.style.border = '2px solid #1d4ed8';
          captchaInput.style.backgroundColor = '#eff6ff';
          captchaInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => captchaInput.focus(), 250);
        }

        window.__msritAutoFillDoneForUrl = window.location.href;
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: 'STEP1_FILLED' })
        );
        return;
      }

      const isSecondStep =
        bodyText.includes('father') ||
        bodyText.includes('4 digit') ||
        bodyText.includes('four digit') ||
        bodyText.includes('mobile') ||
        bodyText.includes('phone');

      if (isSecondStep) {
        const digitInput = Array.from(
          document.querySelectorAll('input[type="text"], input[type="number"], input[type="password"], input:not([type])')
        ).find((el) => el.offsetParent !== null && !el.disabled && !el.readOnly);

        if (digitInput && DATA.fatherLast4) {
          digitInput.value = DATA.fatherLast4;
          triggerEvents(digitInput);

          const submitBtn =
            document.querySelector('button[type="submit"], input[type="submit"]') ||
            Array.from(document.querySelectorAll('button, input[type="button"], a.btn')).find((b) =>
              /verify|submit|next|login|continue|proceed/i.test(b.innerText || b.value || '')
            );

          window.__msritAutoFillDoneForUrl = window.location.href;
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
            JSON.stringify({ type: 'STEP2_SUBMITTED' })
          );

          if (submitBtn) {
            setTimeout(() => submitBtn.click(), 200);
          } else if (digitInput.form) {
            setTimeout(() => digitInput.form.submit(), 200);
          }
        }
      }
    })();
    true;
  `;
}
