export const PREVIEW_PAGE_CLIENT = `
    (function () {
      'use strict'

      var state = {
        activeView: 'preview',
        failed: false,
        html: '',
        pendingRefresh: false,
        text: '',
        selectedName: '',
        signature: '',
        revision: 0,
        refreshing: false,
        viewport: '600'
      }
      var elements = {
        copy: document.getElementById('copy-button'),
        empty: document.getElementById('empty'),
        error: document.getElementById('error'),
        fixtureNote: document.getElementById('fixture-note'),
        html: document.getElementById('panel-html'),
        iframe: document.getElementById('panel-preview'),
        open: document.getElementById('open-link'),
        previewControls: document.getElementById('preview-controls'),
        select: document.getElementById('template-select'),
        sizeBadge: document.getElementById('size-badge'),
        sizeValue: document.getElementById('size-value'),
        status: document.getElementById('status'),
        statusText: document.getElementById('status-text'),
        subject: document.getElementById('subject'),
        subjectValue: document.getElementById('subject-value'),
        tabs: Array.from(document.querySelectorAll('[role="tab"]')),
        text: document.getElementById('panel-text'),
        title: document.getElementById('viewer-title'),
        viewportButtons: Array.from(document.querySelectorAll('.viewport-toggle .segment'))
      }
      var previewRoot = window.location.pathname
      while (previewRoot.endsWith('/')) {
        previewRoot = previewRoot.slice(0, -1)
      }

      function previewUrl(path) {
        return previewRoot + path
      }

      function setStatus(message, statusState) {
        if (elements.status.dataset.state === statusState && elements.statusText.textContent === message) {
          return
        }
        elements.status.dataset.state = statusState
        elements.statusText.textContent = message
      }

      function rawRenderUrl(name) {
        var query = new URLSearchParams({ name: name, revision: String(state.revision) })
        return previewUrl('/render?' + query.toString())
      }

      function jsonRenderUrl(name) {
        var query = new URLSearchParams({ name: name, format: 'json' })
        return previewUrl('/render?' + query.toString())
      }

      function updatePreviewFrame() {
        if (!state.selectedName || !state.html || state.failed) {
          return
        }
        var next = rawRenderUrl(state.selectedName)
        if (elements.iframe.getAttribute('src') !== next) {
          elements.iframe.src = next
        }
      }

      function applyViewport(width) {
        state.viewport = width
        elements.iframe.dataset.width = width
        elements.viewportButtons.forEach(function (button) {
          button.setAttribute('aria-pressed', String(button.dataset.width === width))
        })
      }

      function updateSubject(subject) {
        var hasSubject = typeof subject === 'string' && subject.length > 0
        elements.subject.dataset.state = hasSubject ? 'set' : 'none'
        elements.subjectValue.textContent = hasSubject ? subject : 'No subject defined'
        elements.subjectValue.title = hasSubject ? subject : ''
      }

      function formatKilobytes(bytes) {
        if (bytes < 1024) {
          return bytes + ' B'
        }
        return (bytes / 1024).toFixed(bytes < 102400 ? 1 : 0) + ' KB'
      }

      function updateSize(bytes) {
        if (typeof bytes !== 'number' || !Number.isFinite(bytes)) {
          elements.sizeBadge.hidden = true
          return
        }
        elements.sizeBadge.hidden = false
        var level = bytes > 102400 ? 'over' : bytes >= 81920 ? 'warn' : 'ok'
        elements.sizeBadge.dataset.level = level
        var suffix = level === 'over'
          ? ' · Gmail will clip'
          : level === 'warn' ? ' · near Gmail limit' : ''
        elements.sizeValue.textContent = formatKilobytes(bytes) + suffix
        elements.sizeBadge.title = bytes.toLocaleString() + ' bytes (UTF-8). Gmail clips messages larger than 102,400 bytes; warnings begin at 81,920 bytes.'
      }

      async function fetchJson(url) {
        var response = await fetch(url, { cache: 'no-store' })
        var payload = await response.json()
        if (!response.ok) {
          var error = new Error(payload.statusMessage || payload.message || 'Preview request failed')
          error.details = JSON.stringify(payload.data || payload, null, 2)
          throw error
        }
        return payload
      }

      async function writeClipboard(value) {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          try {
            await navigator.clipboard.writeText(value)
            return
          }
          catch {
            // LAN preview URLs are not secure contexts. Fall through to the
            // selection-based browser API so copying still works on dev Wi-Fi.
          }
        }

        var textarea = document.createElement('textarea')
        textarea.value = value
        textarea.setAttribute('readonly', '')
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        textarea.setSelectionRange(0, value.length)
        var copied = document.execCommand('copy')
        textarea.remove()
        if (!copied) {
          throw new Error('Clipboard unavailable')
        }
      }

      function updateTemplateOptions(templates) {
        var previousName = state.selectedName
        var fragment = document.createDocumentFragment()
        templates.forEach(function (template) {
          var option = document.createElement('option')
          option.value = template.name
          option.disabled = !template.hasFixture
          option.textContent = template.hasFixture ? template.name : template.name + ' — no fixture'
          fragment.appendChild(option)
        })
        elements.select.replaceChildren(fragment)

        var fixtureTemplates = templates.filter(function (template) { return template.hasFixture })
        var previousStillExists = fixtureTemplates.some(function (template) {
          return template.name === previousName
        })
        state.selectedName = previousStillExists
          ? previousName
          : (fixtureTemplates[0] ? fixtureTemplates[0].name : '')

        elements.select.disabled = fixtureTemplates.length === 0
        if (state.selectedName) {
          elements.select.value = state.selectedName
          elements.fixtureNote.textContent = 'Using ' + state.selectedName + '.fixtures.ts'
        }
        else {
          elements.fixtureNote.textContent = templates.length === 0
            ? 'Add a Vue SFC under app/emails to begin.'
            : 'Add a colocated .fixtures.ts file to enable preview.'
        }
      }

      function updateActions() {
        var hasOutput = Boolean(state.selectedName && state.html && !state.failed)
        elements.copy.disabled = !hasOutput
        elements.copy.textContent = state.activeView === 'text' ? 'Copy text' : 'Copy HTML'
        elements.open.setAttribute('aria-disabled', hasOutput ? 'false' : 'true')
        elements.open.tabIndex = hasOutput ? 0 : -1
        if (hasOutput) {
          elements.open.href = rawRenderUrl(state.selectedName)
        }
        else {
          elements.open.removeAttribute('href')
        }
      }

      function showView(view) {
        state.activeView = view
        elements.tabs.forEach(function (tab) {
          var selected = tab.dataset.view === view
          tab.setAttribute('aria-selected', String(selected))
          tab.tabIndex = selected ? 0 : -1
        })
        elements.iframe.hidden = view !== 'preview'
        elements.html.hidden = view !== 'html'
        elements.text.hidden = view !== 'text'
        elements.previewControls.hidden = view !== 'preview'
        updateActions()
      }

      function showError(error) {
        var message = error.message || String(error)
        elements.error.textContent = error.details ? message + '\\n\\n' + error.details : (error.stack || message)
        elements.error.hidden = false
        elements.empty.hidden = true
        state.failed = true
        state.html = ''
        state.text = ''
        state.signature = ''
        elements.iframe.hidden = true
        elements.iframe.removeAttribute('src')
        elements.html.hidden = true
        elements.html.textContent = ''
        elements.text.hidden = true
        elements.text.textContent = ''
        updateActions()
        setStatus('Render failed', 'error')
      }

      function clearError() {
        elements.error.textContent = ''
        elements.error.hidden = true
        state.failed = false
      }

      async function refresh(announceActivity) {
        if (state.refreshing) {
          if (announceActivity) {
            state.pendingRefresh = true
            setStatus('Refreshing…', 'loading')
          }
          return
        }
        state.refreshing = true
        if (announceActivity) {
          setStatus('Refreshing…', 'loading')
        }

        try {
          var list = await fetchJson(previewUrl('/api/templates'))
          var previousName = state.selectedName
          updateTemplateOptions(list.templates)
          if (previousName !== state.selectedName) {
            state.signature = ''
          }

          if (!state.selectedName) {
            state.html = ''
            state.text = ''
            elements.title.textContent = 'No fixture-backed templates'
            elements.empty.hidden = false
            updateSubject(undefined)
            elements.subjectValue.textContent = 'No template selected'
            updateSize(undefined)
            clearError()
            updateActions()
            setStatus('Waiting for fixture', 'ready')
            return
          }

          var requestedName = state.selectedName
          var output = await fetchJson(jsonRenderUrl(requestedName))
          if (requestedName !== state.selectedName) {
            return
          }
          var nextSignature = JSON.stringify([output.name, output.html, output.text, output.subject || null])
          var outputChanged = nextSignature !== state.signature
          if (outputChanged) {
            state.signature = nextSignature
            state.html = output.html
            state.text = output.text
            state.revision += 1
            elements.html.textContent = output.html
            elements.text.textContent = output.text
            elements.iframe.title = 'Email preview: ' + output.name
          }
          updateSubject(output.subject)
          updateSize(output.bytes)

          elements.title.textContent = output.name
          elements.empty.hidden = true
          var recoveredFromError = state.failed
          clearError()
          if (outputChanged) {
            updatePreviewFrame()
          }
          showView(state.activeView)
          if (announceActivity || recoveredFromError) {
            setStatus('Up to date', 'ready')
          }
          else if (outputChanged) {
            setStatus('Updated', 'ready')
          }
        }
        catch (error) {
          showError(error)
        }
        finally {
          state.refreshing = false
          if (state.pendingRefresh) {
            state.pendingRefresh = false
            void refresh(true)
          }
        }
      }

      elements.select.addEventListener('change', function () {
        state.selectedName = elements.select.value
        state.signature = ''
        void refresh(true)
      })

      elements.tabs.forEach(function (tab, index) {
        tab.addEventListener('click', function () {
          showView(tab.dataset.view)
        })
        tab.addEventListener('keydown', function (event) {
          var nextIndex = index
          if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
            nextIndex = (index + 1) % elements.tabs.length
          }
          else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
            nextIndex = (index - 1 + elements.tabs.length) % elements.tabs.length
          }
          else if (event.key === 'Home') {
            nextIndex = 0
          }
          else if (event.key === 'End') {
            nextIndex = elements.tabs.length - 1
          }
          else {
            return
          }
          event.preventDefault()
          elements.tabs[nextIndex].focus()
          showView(elements.tabs[nextIndex].dataset.view)
        })
      })

      document.addEventListener('keydown', function (event) {
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
          return
        }
        var index = Number(event.key) - 1
        if (index >= 0 && index < elements.tabs.length && document.activeElement !== elements.select) {
          showView(elements.tabs[index].dataset.view)
        }
      })

      elements.copy.addEventListener('click', async function () {
        var value = state.activeView === 'text' ? state.text : state.html
        try {
          await writeClipboard(value)
          var copiedMessage = state.activeView === 'text' ? 'Text copied' : 'HTML copied'
          setStatus(copiedMessage, 'ready')
          window.setTimeout(function () {
            if (elements.statusText.textContent === copiedMessage) {
              setStatus('Up to date', 'ready')
            }
          }, 1600)
        }
        catch (error) {
          setStatus('Clipboard unavailable', 'error')
        }
      })

      elements.open.addEventListener('click', function (event) {
        if (elements.open.getAttribute('aria-disabled') === 'true') {
          event.preventDefault()
        }
      })

      elements.viewportButtons.forEach(function (button) {
        button.addEventListener('click', function () {
          applyViewport(button.dataset.width)
        })
      })

      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') {
          void refresh(false)
        }
      })

      applyViewport(state.viewport)
      showView('preview')
      void refresh(true)
      window.setInterval(function () {
        if (document.visibilityState === 'visible') {
          void refresh(false)
        }
      }, 1000)
    })()
`
