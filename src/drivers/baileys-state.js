// Transport status is process-local. A restart must never claim a restored session is online before 'open'.
export const states={};
export const status=ch=>({...states[ch.id]||{state:'disconnected',detail:'Sessão ainda não iniciada'},qr_available:states[ch.id]?.state==='qr'});
