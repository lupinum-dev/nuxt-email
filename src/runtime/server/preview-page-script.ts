export const PREVIEW_PAGE_CLIENT: string = `
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
        refreshing: false
      }
      var elements = {
        copy: document.getElementById('copy-button'),
        empty: document.getElementById('empty'),
        error: document.getElementById('error'),
        fixtureNote: document.getElementById('fixture-note'),
        html: document.getElementById('panel-html'),
        iframe: document.getElementById('panel-preview'),
        open: document.getElementById('open-link'),
        select: document.getElementById('template-select'),
        status: document.getElementById('status'),
        statusText: document.getElementById('status-text'),
        tabs: Array.from(document.querySelectorAll('[role="tab"]')),
        text: document.getElementById('panel-text'),
        title: document.getElementById('viewer-title')
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
        return '/__email/render?' + query.toString()
      }

      function jsonRenderUrl(name) {
        var query = new URLSearchParams({ name: name, format: 'json' })
        return '/__email/render?' + query.toString()
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
        updateActions()
      }

      function showError(error) {
        var message = error.message || String(error)
        elements.error.textContent = error.details ? message + '\\n\\n' + error.details : (error.stack || message)
        elements.error.hidden = false
        elements.empty.hidden = true
        state.failed = true
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
          var list = await fetchJson('/__email/api/templates')
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
          var nextSignature = JSON.stringify([output.name, output.html, output.text])
          var outputChanged = nextSignature !== state.signature
          if (outputChanged) {
            state.signature = nextSignature
            state.html = output.html
            state.text = output.text
            state.revision += 1
            elements.html.textContent = output.html
            elements.text.textContent = output.text
            elements.iframe.title = 'Email preview: ' + output.name
            elements.iframe.src = rawRenderUrl(output.name)
          }

          elements.title.textContent = output.name
          elements.empty.hidden = true
          var recoveredFromError = state.failed
          clearError()
          updateActions()
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
          await navigator.clipboard.writeText(value)
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

      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') {
          void refresh(false)
        }
      })

      showView('preview')
      void refresh(true)
      window.setInterval(function () { void refresh(false) }, 1000)
    })()
`
