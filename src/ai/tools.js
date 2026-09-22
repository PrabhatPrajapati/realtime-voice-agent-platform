/**
 * OpenAI Realtime Function/Tool Definitions
 * Enables structured extraction of issues, CSR handoffs, and call termination
 */

export const realtimeTools = [
  {
    type: 'function',
    name: 'create_issue',
    description:
      'Extracts and saves structured customer issue details discovered during the phone call before transferring to CSR.',
    parameters: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description:
            'A single clear and concise factual summary of the issue the customer reported (e.g. "Customer cannot log into mobile app due to invalid credentials error")',
        },
        category: {
          type: 'string',
          enum: [
            'LOGIN',
            'PAYMENT',
            'ACCOUNT',
            'TECHNICAL',
            'PERFORMANCE',
            'ACCESS',
            'OTHER',
          ],
          description: 'The root category of the customer problem.',
        },
        priority: {
          type: 'string',
          enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
          description:
            'Estimated severity. If unsure, use MEDIUM. Use HIGH/URGENT if business critical or customer is blocked.',
        },
        customerRequestedHuman: {
          type: 'boolean',
          description: 'Set to true if customer explicitly asked for a human agent.',
        },
      },
      required: ['summary', 'category', 'priority'],
    },
  },
  {
    type: 'function',
    name: 'transfer_to_csr',
    description:
      'Transfers the live call to the human CSR support specialist. ONLY invoke this tool AFTER the customer has explicitly confirmed they want to be transferred (e.g. said "yes", "please connect me", "transfer me") or directly requested a human. NEVER invoke this tool while asking the customer a question or before they confirm.',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Brief reason for transfer (e.g. "Customer confirmed transfer", "Customer requested human").',
        },
        summary: {
          type: 'string',
          description: 'Brief summary of the issue to pass along to CSR.',
        },
      },
      required: ['reason'],
    },
  },
  {
    type: 'function',
    name: 'request_callback',
    description:
      'Saves a callback request when the customer is busy or requests to be called back later.',
    parameters: {
      type: 'object',
      properties: {
        preferredTime: {
          type: 'string',
          description: 'Customer specified preferred time or date for callback, if any.',
        },
        reason: {
          type: 'string',
          description: 'Reason for callback.',
        },
      },
      required: ['reason'],
    },
  },
  {
    type: 'function',
    name: 'mark_do_not_call',
    description:
      'Marks the customer as DO_NOT_CALL when they request to be removed from calling list or opt-out.',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Customer opted out / requested removal from call list.',
        },
      },
    },
  },
  {
    type: 'function',
    name: 'end_call',
    description:
      'Terminates the call after concluding conversation (e.g. No issue confirmed, callback scheduled, or customer hung up).',
    parameters: {
      type: 'object',
      properties: {
        outcome: {
          type: 'string',
          enum: [
            'NO_ISSUE',
            'ISSUE_FOUND',
            'HUMAN_REQUESTED',
            'CALLBACK',
            'DO_NOT_CALL',
            'FAILED',
          ],
          description: 'Final categorized outcome of the call.',
        },
        feedback: {
          type: 'string',
          description: 'Optional customer feedback collected, if any.',
        },
        summary: {
          type: 'string',
          description: 'Brief 1-sentence final outcome summary.',
        },
      },
      required: ['outcome'],
    },
  },
];
