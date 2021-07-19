window.onload = function()  {
  if(localStorage.getItem('login')) {
    login.value = localStorage.getItem('login');
    app.getDeliveryList(localStorage.getItem('id'));
    switch(sessionStorage.getItem('part')) {
      case 'deliveryMap':
        app.openPart('deliveryMap');
        break;
      case 'deliveryFinish':
        app.openPart('deliveryFinish');
        break;
      default:
        console.log("Данные обновлены");
    }
  }

  const elMenu = menu.querySelectorAll('a'),
        numElMenu = elMenu.length;
  for(i=0; i<numElMenu; i++) {
    elMenu[i].onclick = app.onClickElMenu;
  }

  enter.onclick = function() {
    if(!login.value || !pass.value) alert("Жизнь прекрасна, но надо иногда и поля заполнять!")
    else  app.checkLogPass(login.value, pass.value);
  }
  document.querySelector('#header div').addEventListener('click', app.toggleMainBlocks);

  exit.onclick = function() {
    login.value = "";
    pass.value = "";
    app.clearAll();
    localStorage.clear();
  }
}

function Application() {
  this.adres = "https://a410.bitrix24.ru/rest/1/xg6jilmx8dvece1f/",
  this.xhr = new XMLHttpRequest();
}

Application.prototype.toggleMainBlocks = function() {
  generalInf.classList.toggle('hidden');
  setting.classList.toggle('hidden');
}

Application.prototype.checkLogPass = function(login, pass) {
  const xhr = this.xhr;
  xhr.open("GET", this.adres+"lists.element.get.json?IBLOCK_TYPE_ID=lists_socnet&IBLOCK_ID=73&FILTER[PROPERTY_453]="+login, true);
  xhr.onload = function()	{
    const responseObj = JSON.parse(xhr.response).result;
    if(xhr.status == 200)	{
      if(responseObj.length > 0) {
        for(let i in responseObj[0].PROPERTY_449) {
          if(responseObj[0].PROPERTY_449[i] === pass) {
            app.getDeliveryList(responseObj[0].ID);
            localStorage.setItem('login', login);
            localStorage.setItem('pass', pass);
            localStorage.setItem('id', responseObj[0].ID);
          }
          else return alert('Есть в базе такой номер, осталось подобрать пароль))');
        }
      }else return alert('Перелогинься, я тебя не знаю!');
    }else return alert('Сервер временно не доступен. Попробуйте повторить запрос чуть позже');
  }
  xhr.send(null);
}

Application.prototype.getDeliveryList = function(id) { // Загрузка списка заказов
  const xhr = this.xhr;
  app.toggleMainBlocks();
  xhr.open("GET", this.adres+"crm.deal.list.json?ORDER[ID]=DESC&FILTER[UF_CRM_1624521910]="+id, true);
  xhr.onload = function()	{
    const responseObj = JSON.parse(xhr.response).result;
          noDelObj = [];
    app.clearAll();
    responseObj.forEach(function(obj) {
      switch(obj.STAGE_ID) {
        case "C1:PREPARATION":
          app.addToDeliveryList(obj);
          break;
        case "C1:WON":
        case "C1:FINAL_INVOICE":
          app.addToDeliveryClose(obj);
          break;
        default:
          noDelObj.push(obj);
      }
    });
    app.addListenerEndDelivery();
  }
  xhr.send(null);
}

Application.prototype.addToDeliveryList = function(obj) {
  const info = obj.SOURCE_DESCRIPTION.split("|"),
        newItem = document.createElement('tr');
  newItem.innerHTML = '<td><table class="target"><tr><th></th><th>'+obj.TITLE+'</th><th></th></tr>'+
          '<tr val="'+obj.ID+'"><td class="endDelivery" name="no"><a href="#"><img src="pic/no.svg" alt=""></a></td>'+
          '<td><a href="https://yandex.ru/maps/?mode=whatshere&whatshere%5Bpoint%5D='+info[1].split(";")[1]+'%2C'+info[1].split(";")[0]+'&whatshere%5Bzoom%5D=17" target="_blanc">'+info[0].replace(/, Россия/,'')+'</a><br>'+
          'Ближайшее метро: <b>'+info[2]+'</b><br>'+
          info[4]+': <a href="tel:+7'+info[5]+'">'+info[5]+'</a><br>'+
          'Доставка: '+obj.BEGINDATE.split("T")[0]+' '+info[3]+'<br>'+
          '<p>'+obj.COMMENTS+'</p></td>'+
          '<td class="endDelivery" name="yes"><a href="#"><img src="pic/yes.svg" alt=""></a></td></tr>'+
          '<tr class="raport hidden" name="'+obj.ID+'"><td class="left"></td>'+
          '<td><textarea value=""></textarea><br><button class="sell">Отправить</button><button class="cancel">Отмена</button></td>'+
          '<td class="right"></td></tr></table></td>';
  document.querySelector('#deliveryList tbody').append(newItem);
}

Application.prototype.addToDeliveryClose = function(obj) {
  const info = obj.SOURCE_DESCRIPTION.split("|"),
        newItem = document.createElement('tr');
  newItem.className = "close_dlvr";
  newItem.innerHTML = '<td><table><tr><th>'+obj.TITLE+'</th></tr>'+
          '<tr val="'+obj.ID+'"><td>'+info[0]+'<br>'+
          'Ближайшее метро: <b>'+info[2]+'</b><br>'+
          info[4]+': <a href="tel:+7'+info[5]+'">'+info[5]+'</a><br>'+
          'Доставка: '+obj.BEGINDATE.split("T")[0]+' '+info[3]+'<br>'+
          '<p>'+obj.COMMENTS+'</p></td></tr>'+
          '<tr class="raport" name="'+obj.ID+'"><td></td></tr></table></td>';
  document.querySelector('#deliveryFinish tbody').append(newItem);
}

Application.prototype.onClickElMenu = function(elt) {
  const name = elt.path[0].name;
  app.openPart(name);
}

Application.prototype.openPart = function(name) {
  sessionStorage.setItem('part', name);
  document.querySelectorAll('#generalInf div').forEach((element) => element.classList.add('hidden'));
  setting.classList.add('hidden');
  generalInf.classList.remove('hidden');
  document.getElementById(name).classList.remove('hidden');
}

Application.prototype.addListenerEndDelivery = function()  { // Подключаем обработчики выведенной информации
  const eltDelivery = document.querySelectorAll('.endDelivery');
  for(let i=0; i<eltDelivery.length; i++) {
    eltDelivery[i].onclick = app.endDelivery(eltDelivery[i]);
  }
}

Application.prototype.endDelivery = function(elem)  {
  const name = elem.parentNode.getAttribute('val'),
        target = document.querySelector('.raport[name="'+name+'"]');
  elem.querySelector('a').onclick = function() {
    target.parentNode.querySelectorAll('.endDelivery img').forEach((el) => el.classList.add('hidden'));
    elem.querySelector('img').classList.remove('hidden');
    target.classList.remove('hidden');
    target.querySelector('textarea').focus();
    app.addListenerDeliveryClose(target, elem.getAttribute('name'));
  }
}

Application.prototype.addListenerDeliveryClose = function(target, res) {
  target.querySelectorAll('button').forEach(function(elt) {
    elt.addEventListener('click', function() {
      target.parentNode.querySelectorAll('.endDelivery img').forEach((el) => el.classList.remove('hidden'));
      target.classList.add('hidden');
      if(elt === target.querySelector('.sell')) pushRaport(target, res)
      else return false;
    });
  });
  target.querySelector('textarea').addEventListener('input', function () {
    this.style.height = 0;
    this.style.height = Math.max(60,this.scrollHeight) + 'px';
  });
}

Application.prototype.pushRaport = function(trgt, res) { // Отправка данных на портал
  const id = (res === "yes")  ? "C1:WON"  : "C1:FINAL_INVOICE",
        xhr = this.xhr;
  trgt.parentNode.parentNode.classList.add('hidden');
  xhr.open("POST", this.adres+"crm.deal.update.json?ID="+trgt.getAttribute('name')+"&FIELDS[STAGE_ID]="+id, true);
  xhr.onload = function()	{
    app.sellComment(trgt);
    return alert("Миссия завершена!");
  }
  xhr.send(null);
}

Application.prototype.sellComment = function(trgt) {
  const xhr = this.xhr;
  xhr.open("POST", this.adres+"crm.timeline.comment.add.json?FIELDS[ENTITY_ID]="+trgt.getAttribute('name')+
    "&FIELDS[ENTITY_TYPE]=DEAL&FIELDS[COMMENT]="+trgt.querySelector('textarea').value, true);
  xhr.onload = function()	{
  }
  xhr.send(null);
}

Application.prototype.clearAll = function() {
  document.querySelector('#deliveryList tbody').innerHTML = "";
  document.querySelector('#deliveryFinish tbody').innerHTML = "";
  exit.classList.toggle('hidden');
  enter.classList.toggle('hidden');
}

const app = new Application();