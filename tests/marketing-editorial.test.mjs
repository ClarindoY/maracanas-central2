import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicSlideCopy} from '../src/marketing-art.mjs';
import {validateBrief,marketingRequest} from '../server/marketing.mjs';
import {DEFAULT_BRIEF,EMPTY_PROFILE} from '../shared/marketing.mjs';
test('arte remove rótulos internos de projetos antigos preservando títulos reais',()=>{
 assert.equal(publicSlideCopy({heading:'Gancho',text:'O acabamento muda a percepção da sua peça.'}),'O acabamento muda a percepção da sua peça.');
 assert.equal(publicSlideCopy({heading:'Desenvolvimento',text:'Desenvolvimento:\nConfira as emendas.'}),'Confira as emendas.');
 assert.equal(publicSlideCopy({heading:'Confira as emendas',text:'Antes de fechar o projeto.'}),'Confira as emendas\n\nAntes de fechar o projeto.');
 assert.equal(publicSlideCopy({heading:'',text:'Gancho de parede também precisa de acabamento.'}),'Gancho de parede também precisa de acabamento.');
});
test('polarização e ângulo chegam à criação com validação e compatibilidade de brief antigo',()=>{
 const brief=validateBrief({...DEFAULT_BRIEF,polarization:'Polarizado',angle:'Pelo bolso',objective:'Gerar engajamento'});
 const request=marketingRequest(brief,EMPTY_PROFILE,'Texto puro');assert.equal(request.input.brief.angle,'Pelo bolso');assert.match(request.instructions,/idade, anos de experiência/);assert.match(request.instructions,/Nunca use Gancho/);
 assert.equal(validateBrief({...DEFAULT_BRIEF,polarization:undefined,angle:undefined}).polarization,'Direto');
 assert.throws(()=>validateBrief({...DEFAULT_BRIEF,polarization:'Inválido'}));assert.throws(()=>validateBrief({...DEFAULT_BRIEF,angle:'Inválido'}));
});
