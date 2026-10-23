export async function completeDNA(api,profile,onSaved=()=>{}){
 const saved=await api('/api/marketing/profile','PUT',profile);
 onSaved(saved);
 try{
 const suggestion=await api('/api/marketing/profile/suggest','POST',saved);
 const changed=Object.keys(suggestion.data).some(key=>suggestion.data[key]!==saved.data[key]);
 return {profile:suggestion,changed};
 }catch(error){
 throw new Error('Personalização salva. Não foi possível completar o DNA com IA: '+error.message+'. Suas respostas continuam salvas; tente Montar com IA em Seu DNA.');
 }
}
