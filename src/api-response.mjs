export async function readApiResponse(response,url){
 const type=response.headers.get('content-type')||'';
 if(!/application\/(?:[\w.-]+\+)?json\b/i.test(type))throw new Error(`O servidor não entregou os dados de ${url.split('?')[0]} (HTTP ${response.status}). Recebemos uma página em vez da API. Confira se o serviço completo está iniciado com npm start e se /api está direcionado a ele.`);
 let data;try{data=await response.json();}catch{throw new Error('O servidor enviou dados incompletos. Tente novamente.');}
 if(!response.ok)throw new Error(data?.error||`Falha no servidor (HTTP ${response.status}).`);
 return data;
}
