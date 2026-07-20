export default defineEventHandler(() => {
  return renderEmail('welcome', {
    dashboardUrl: 'https://example.com/workspaces/northstar',
    firstName: 'Ada',
    supportEmail: 'support@example.com',
    workspaceName: 'Northstar',
  })
})
