import crypto from 'node:crypto';
export async function send(_channel,{kind}){if(!['text','image','audio','video','file'].includes(kind))throw Error('Tipo não suportado no chat do site');return 'site:'+crypto.randomUUID()}
export async function presence(){}
