import {q} from '../db.js';import {sendMailReply} from '../mail-inboxes.js';
export const send=(channel,message)=>sendMailReply(q,channel,message);
