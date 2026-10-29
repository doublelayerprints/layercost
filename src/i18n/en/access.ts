import type { accessIt } from '../it/access'

export const accessEn: Record<keyof typeof accessIt, string> = {
  'access.title': 'Request access',
  'access.description':
    'Send a request to the administrator to get a cloud account. The cloud is optional: the calculator stays available without an account.',
  'access.intro':
    'Fill in the form to request access to the shared cloud. The request does not create an account: the administrator reviews it manually.',
  'access.email': 'Email',
  'access.emailHint': 'Up to 254 characters. We will use this address to reply to you.',
  'access.name': 'Name',
  'access.nameHint': 'Optional, up to 80 characters.',
  'access.message': 'Message',
  'access.messageHint': 'Optional, up to 500 characters.',
  'access.privacyNote':
    'Data is sent to Formspree (processor, United States) and kept for 30 days. The administrator deletes the notification email after the decision or within 12 months. No analytics, first-party cookies or newsletter.',
  'access.privacyConsent':
    'I have read the privacy note and consent to the processing of my data to handle the access request.',
  'access.honeypot': 'Do not fill in this field',
  'access.submit': 'Send request',
  'access.submitting': 'Sending…',
  'access.retry': 'Try again',
  'access.success.title': 'Request sent',
  'access.success.body':
    'The administrator will review the request. If needed, they will reply to the address you provided.',
  'access.success.noEmail':
    'You will not receive an automatic confirmation email: this page is the confirmation that the request was sent.',
  'access.success.back': 'Back to the calculator',
  'access.unavailable.title': 'Form unavailable',
  'access.unavailable.body': 'The form is not available in this build. Contact the administrator.',
  'access.error.title': 'Could not send the request',
  'access.error.notConfigured': 'The form is not available in this build.',
  'access.error.network': 'Could not reach the service. Check your connection and try again.',
  'access.error.rateLimited': 'Too many requests. Try again in a few minutes.',
  'access.error.server': 'The service is unavailable right now. Try again later.',
  'access.error.rejected': 'The request was not accepted. Check the details and try again.',
  'access.error.unknown': 'Could not send the request. Try again.',
  'access.validation.emailRequired': 'Enter your email.',
  'access.validation.emailInvalid': 'Enter a valid email address.',
  'access.validation.emailTooLong': 'The email exceeds 254 characters.',
  'access.validation.nameTooLong': 'The name exceeds 80 characters.',
  'access.validation.messageTooLong': 'The message exceeds 500 characters.',
  'access.validation.privacyRequired':
    'You must consent to the processing of your data to send the request.',
  'access.noAccount': 'Don’t have an account?',
  'access.requestAccess': 'Request access',
}
