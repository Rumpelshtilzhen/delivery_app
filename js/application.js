function Application() {
  
}

/* контент загружен */
Application.prototype.displayContent = function(loadDeliveryList, loadDeliveryFinish) {
  (loadDeliveryFinish) ? deliveryFinish[0].innerHTML = loadDeliveryFinish : deliveryFinish[0].innerHTML = 'Здесь пока ничего нет';
  if(loadDeliveryList) {
    deliveryList[0].innerHTML = loadDeliveryList;
    // console.log(loadDeliveryList);
    this.content.addListenerDeliveryCard();
  }else deliveryList[0].innerHTML = 'Здесь пока ничего нет';
  shell.openLastPart();
}

Application.prototype.start = function() {
  settingform.enter.onclick = this.door.enter;
  settingform.exit.onclick = this.door.exit;
  this.door.strphone();
  this.door.loadSession();
}

/* Фомирование контента */
Application.prototype.door = {
  strphone: function(masked = '(___) ___-____') {
    const elem = settingform.phone;

	  function mask(event) {
      const keyCode = event.keyCode,
            template = masked,
            def = template.replace(/\D/g, ""),
            val = this.value.replace(/\D/g, "");

      let i = 0,
          newValue = template.replace(/[_\d]/g, (a) => i < val.length ? val.charAt(i++) || def.charAt(i) : a);
      i = newValue.indexOf("_");
      if(i !== -1) newValue = newValue.slice(0, i);

      let reg = template.substr(0, this.value.length)
            .replace(/_+/g, (a) => "\\d{1,"+a.length+"}")
            .replace(/[+()]/g, "\\$&");
      reg = new RegExp("^"+reg+"$");
      if(!reg.test(this.value) || this.value.length < 5 || keyCode > 47 && keyCode < 58) this.value = newValue;
      if(event.type === "blur" && this.value.length < 5) this.value = "";
    }

    elem.addEventListener("input", mask);
    elem.addEventListener("focus", mask);
    elem.addEventListener("blur", mask);
  },

  /* - Вход в ЛК */
  enter: function(e) {
    e.preventDefault();
    settingform.email.value = settingform.email.value.replace(/\s+/g, '');

    let regexpmail = /^([a-zA-Z0-9_\.-]+)@a410\.ru$/gi,
        phone = settingform.phone.value,
        email = settingform.email.value;
    
    if(!phone || !email) return alert("Для входа необходимо заполнить все поля!")
    else if(!regexpmail.test(email)) return alert('Вы уверены, что являетесь нашим сотрудником?')
    else app.door.verifyUser(new FormData(settingform));
  },

  /* - выход из учётной записи */
  exit: function(e) {
    e.preventDefault();
    settingform.phone.value = "";
    settingform.email.value = "";
    app.displayContent();
    app.door.titleMessage("Введите данные пользователя");
    localStorage.clear();
    sessionStorage.clear();
    app.door.toggleButtons();
  },

  titleMessage: function(message) {
    setting.querySelector('.titleform').textContent = message;
  },

  /* - восстановление предыдущей сессии */
  loadSession: function() {
    if( localStorage.getItem('phone') ) {
      settingform.phone.value = localStorage.getItem('phone');
      settingform.email.value = localStorage.getItem('email');

      settingform.enter.click();
    }else {
      console.log('Новая сессия');
      setting.classList.remove('hidden');
    }
  },

  /* - запрос для входа в ЛК */
  verifyUser: function(form) {
    let response = shell.getJsonQuest(form);

    response.then(
      (info) => {
        console.log(info);
        if(!info.result) return this.titleMessage(info);
        this.toggleButtons();
        
        return this.getDeliveryList(info);
      },
      (error) => {
        if( localStorage.getItem('deliveryList') || localStorage.getItem('deliveryFinish') ) {
          console.log(`Rejected: ${ error }`);
          console.log('Новые данные не подгрузились, загружаем из памяти');
          // app.displayContent();
          app.displayContent(localStorage.getItem('deliveryList'), localStorage.getItem('deliveryFinish'));
        }
        return this.titleMessage("Обновите список, когда снова станет доступен интернет");
      }
    ).then(
      (res) => {
        app.displayContent(res['deliveryList'], res['deliveryFinish']);
        localStorage.setItem('deliveryList', res['deliveryList']);
        localStorage.setItem('deliveryFinish', res['deliveryFinish']);
      }
    );
  },
  
  /* - Ставим задачу на вывод полученных данных и сохраняем в память браузера */
  getDeliveryList: function(data) {
    if(settingform.phone.value) {
      localStorage.setItem('phone', settingform.phone.value);
      localStorage.setItem('email', settingform.email.value);
      localStorage.setItem('user_id', data.user_id);
    }
    this.titleMessage(`${ data.name }, добро пожаловать в личный кабинет`);

    let varList = "",
        varFinish = "";

    const responseObj = data.result,
          noDelObj = [];

    responseObj.forEach( (obj) => {
      switch(obj.STAGE_ID) {
        case "C1:PREPARATION":
          varList+=this.addToDeliveryList(obj);
        break;
        case "C1:NEW":
        break;
        default:
          varFinish+=this.addToDeliveryClose(obj);
          // noDelObj.push(obj);
      }
    });
    
    return {
      deliveryList: varList,
      deliveryFinish: varFinish
    };
  },

  getDate: function(date) {
    let reDate = new Date(date),
        month = reDate.getMonth()+1;
    month = (month>9) ? month : '0'+month;
    return reDate.getDate()+'.'+month+'.'+reDate.getFullYear();
  },

  actualDate: function(date) {
    let reDate = new Date(),
        month = reDate.getMonth()+1,
        newDate = '';
    month = (month>9) ? month : '0'+month;
    newDate = reDate.getDate()+'.'+month+'.'+reDate.getFullYear();
    return (date == newDate) ? true : false;
  },

  /* - Выводим заказы, которые надо доставить */
  addToDeliveryList: function(obj) {
    // console.log( obj.SOURCE_DESCRIPTION );

    const dateDelivery = (obj.UF_CRM_1637229223801) ? this.getDate(obj.UF_CRM_1637229223801) : 'ДАТА НЕ УКАЗАНА',
          genComment = (obj.COMMENTS) ? obj.COMMENTS : '',
          dlvrComment = (obj.UF_CRM_A410DLV_CMMNT) ? obj.UF_CRM_A410DLV_CMMNT : '',
          additionalInfo = this.returnCorrectJson(obj.SOURCE_DESCRIPTION),
          mapPoint = obj.UF_CRM_A410DLV_ADRES
            .replace(/((к|К)вартира|(п|П)омещение|(п|П)одъезд|(о|О)становка).+/,"")
            .replace(/№\s?/,"")
            .replace(/\s/g,"+"),
          timeDelivery = () => {
            let message = '';

            if(obj.UF_CRM_A410DLV_TIME && obj.UF_CRM_A410DLV_TMETO) message = `с ${ obj.UF_CRM_A410DLV_TIME } до ${ obj.UF_CRM_A410DLV_TMETO }`
            else if(obj.UF_CRM_A410DLV_TIME && !obj.UF_CRM_A410DLV_TMETO) message = `после ${ obj.UF_CRM_A410DLV_TIME }`
            else if(!obj.UF_CRM_A410DLV_TIME && obj.UF_CRM_A410DLV_TMETO) message = `до ${ obj.UF_CRM_A410DLV_TMETO }`;

            return message;
          },
          recipient = () => {
            if(additionalInfo.company) return additionalInfo.company
            else if(additionalInfo.contact) return additionalInfo.contact
            else return 'Смотри комментарии'
          };

    /* -- Отсекаем заявки с неактуальными датами */
    // if(!this.actualDate(dateDelivery)) return '';
    return `<fieldset>
              <legend>${ (obj.UF_CRM_A410DLV_CAGNT) ? obj.UF_CRM_A410DLV_CAGNT : recipient() }</legend>
              <table id="dlv_${ obj.ID }" class="delivery">
                <tr>
                  <td class="endDelivery">
                    <div class="details hidden">
                      <img src="pic/no.svg" alt="" name="no">
                    </div>
                  </td>
                  <td>
                    <br>
                    <span class="zone">Ближайшее метро: <b>${ obj.UF_CRM_A410DLV_ZONE }</b></span><br>
                    Телефон: ${ (obj.UF_CRM_A410DLV_PHONE) ? '<a href="tel:'+obj.UF_CRM_A410DLV_PHONE+'">'+obj.UF_CRM_A410DLV_PHONE+'</a>' : 'не указан' }<br>
                    <p>${ dlvrComment }</p>
                  </td>
                  <td class="endDelivery">
                    <div class="details hidden">
                      <img src="pic/yes.svg" alt="" name="yes">
                    <div>
                  </td>
                </tr>
                <tr>
                  <td colspan="3">
                    <div class="details hidden">
                      <a href="https://www.google.ru/maps/place/${ mapPoint }" target="_blanc"> 
                      ${ obj.UF_CRM_A410DLV_ADRES }</a><br>
                      <p>${ genComment }</p>
                      Сумма заказа: <span class="money">${ obj.OPPORTUNITY }</span><br>
                      <span class="datetime">Доставка: ${ dateDelivery } ${ timeDelivery() }</span><br><br>
                      <form>
                        <input type="hidden" name="formname" value="sendareport">
                        <input type="hidden" name="dlvr_id" value="${ obj.ID }">
                        <textarea class="hidden" name="totalComment">${ dlvrComment }</textarea>
                        <div class="finishDelivery"></div><br>
                        <textarea name="comment" value=""></textarea><br>
                        <button name="sell">Отправить</button>
                        <button name="cancel">Отмена</button>
                      </form>
                    </div>
                  </td>
                </tr>
              </table>
            </fieldset >`;
  },

  /* - Выводим завершённые заказы */
  addToDeliveryClose: function(obj) {
    const dateDelivery = this.getDate(obj.UF_CRM_1637229223801),
          additionalInfo = this.returnCorrectJson(obj.SOURCE_DESCRIPTION),
          recipient = () => {
            if(additionalInfo.company) return additionalInfo.company
            else if(additionalInfo.contact) return additionalInfo.contact
            else return 'Смотри комментарии'
          };

    return `<fieldset>
              <legend>${ obj.TITLE }<br>${ (obj.UF_CRM_A410DLV_CAGNT) ? obj.UF_CRM_A410DLV_CAGNT : recipient() }</legend>
              <table id="dlv_${ obj.ID }" class="close_dlvr">
                <tr><td>
                  ${ obj.UF_CRM_A410DLV_ADRES }<br>
                  Ближайшее метро: <b>${ obj.UF_CRM_A410DLV_ZONE }</b><br>
                  <!-- Имя контакта: <a href="tel:+7...">+79999999999</a><br> -->
                  Сумма заказа: <span class="money">${ obj.OPPORTUNITY }</span><br>
                  Доставлено: ${ dateDelivery }<br>
                  <p>${ obj.UF_CRM_A410DLV_CMMNT }</p>
                </td></tr>
                <tr class="raport" name="${ obj.ID }"><td></td></tr>
              </table>
            </fieldset>`;
  },

  returnCorrectJson: function(jsonString) {
    try {
      return JSON.parse(jsonString);
    }
    catch(err) {
      console.log(err);
      const keys = jsonString.match(/(?<=(\{|",\s)").+?(?=":\s")/g),
            additionalInfo = jsonString.match(/(?<=":\s?").+?(?="\s?(,|\}))/g).map( el => el.replace(/"/g, '\\"') );
      
      let text = '{';
      for(let i=0,keysLegth=keys.length; i<keysLegth; i++ ) text += '"'+keys[i]+'": "'+additionalInfo[i]+'", ';

      return JSON.parse( text.replace(/, $/,'}') );
    }
  },

  toggleButtons: function() {
    settingform.exit.classList.toggle('hidden');
    settingform.enter.classList.toggle('hidden');
  }
}

/* Обработка контента */
Application.prototype.content = {

  /* - Подключаем действия к выведенной информации */
  addListenerDeliveryCard: function() {
    document.querySelectorAll('.delivery').forEach( (elem) => {
      const form = elem.querySelector('form'),
            imgs = elem.querySelectorAll('.endDelivery img');

      /* -- Открыть подробности доставки */
      elem.parentNode.querySelector('legend').addEventListener('click', () => {
        elem.querySelectorAll('.details').forEach(el => el.classList.toggle('hidden'));
        this.clearFinishDeliveryBlock(form);
        imgs.forEach( (el) => el.classList.remove('hidden') );
      });
      /* -- Открыть отчёт о завершении */
      imgs.forEach( (el) => {
        el.addEventListener('click', (event) => {
          if(form.querySelector('.finishDelivery').firstChild) form.cancel.click()
          else {
            imgs.forEach( (elt) => elt.classList.add('hidden') );
            event.target.classList.remove('hidden');
            app.content.clearFinishDeliveryBlock(form);
            app.content.loadYornForm(form, el.getAttribute('name'));
          }
        });
      });
      /* -- Эластичность поля ввода комментариев */
      form.comment.addEventListener('input', function() {
        this.style.height = 0;
        this.style.height = Math.max(60, this.scrollHeight) + 'px';
      });
      
      this.reportDelivery(elem);
    });
  },

  clearFinishDeliveryBlock: function(form) {
    let innerStrings = form.querySelector('.finishDelivery');
    while(innerStrings.firstChild) innerStrings.removeChild(innerStrings.firstChild);
  },

  /* - Обработчик ввода результатов доставки */
  reportDelivery: function(targetTable) {
    const form = targetTable.querySelector('form');

    /* -- Нажатие итоговых кнопок */
    form.cancel.addEventListener('click', (event) => {
      event.preventDefault();
      targetTable.querySelectorAll('.endDelivery img').forEach(el => el.classList.remove('hidden'));
      this.clearFinishDeliveryBlock(form);
    });
    form.sell.addEventListener('click', (event) => {
      event.preventDefault();

      if(event.target === form.sell) {
        if(form.reasonCancellation && !form.comment.value) {
          switch (form.reasonCancellation.value) {
            case 'cancel_deal':
              return alert("Установлена отметка, что клиент отказался от товара.\nУкажите причину отказа в комментариях");
            case 'postponement':
              return alert("Установлена отметка, что требуется перенести доставку на другое время.\nОпишите подробности в комментариях");
            default:
              if(!form.reasonCancellation.value) return alert("Не имеет смысла отправлять пустую форму");
          }
        }
        if(form.pay) {
          switch (form.pay.value) {
            case 'free':
              if(!form.comment.value) return alert("Установлена отметка, что курьер не принимает оплату.\nОпишите договорённости по оплате");
            break;
            case 'combopay':
              if(!form.payoncash.value || !form.payoncashless.value) return alert("Укажите подробности всех методов оплаты");
            break;
            case 'cash':
              if(!form.payoncash.value) return alert("Укажите полученную сумму");
            break;
            case 'cashless':
              if(!form.payoncashless.value) return alert("Приложите фотографию проведённого эквайринга");
            break;
            default:
              if(!form.comment.value) return alert("Не имеет смысла отправлять пустую форму");
          }
        }
        if(form.comment.value) {
          if(!form.reasonCancellation && !form.pay) {
            if(confirm('Отправить комментарий без отметки о доставке?')) console.log('Продолжаем');
            else return console.log('Отмена отправки сообщения');
          }
          form.comment.value = '\n\n' + form.comment.value;
        }
        form.totalComment.value += form.comment.value + '\n\n>';
        form.classList.add('hidden');
        this.pushReport(form);
      }
    });
  },

  loadYornForm: function(form, yorn) {
    switch(yorn) {
      case 'yes':
        if(!form.pay) {
          form.querySelector('.finishDelivery').insertAdjacentHTML('afterbegin',
            // <label><input type="radio" name="pay" value="free"><span>Без оплаты</span></label><br><br>
            // <label><input type="radio" name="pay" value="bill"><span>Счёт (банковский перевод)</span></label><br><br>
            `<label><input type="radio" name="pay" value="cash"><span>Наличные</span></label><br>
            <label class="hidden">Ввести сумму: <input type="tel" name="payoncash">руб. <input type="number" name="kopeek" maxlength="2" placeholder="00" value="00">коп.<br></label>
            <br>
            <label><input type="radio" name="pay" value="cashless" class="loadCheck"><span>Эквайринг (по карте)</span></label><br>
            <label class="hidden">Загрузить фото чека: <input type="file" name="payoncashless"><br></label>
            <br>
            <label><input type="radio" name="pay" value="combopay"><span>Комбооплата</span></label><br><br>
            <label><input type="radio" name="pay" value="free" checked><span>Прочее</span></label>`
          );

          for(let i=0, num=form.pay.length; i<num; i++) {
            form.pay[i].addEventListener('change', (event) => {
              switch (event.target.value) {
                case 'combopay':
                  form.payoncash.parentNode.classList.remove('hidden');
                  form.payoncashless.parentNode.classList.remove('hidden');
                break;
                case 'cash':
                  form.payoncash.parentNode.classList.remove('hidden');
                  form.payoncashless.parentNode.classList.add('hidden');
                  form.payoncash.focus();
                break;
                case 'cashless':
                  form.payoncashless.parentNode.classList.remove('hidden');
                  form.payoncash.parentNode.classList.add('hidden');
                  form.payoncashless.click();
                break;
                default:
                  form.payoncash.parentNode.classList.add('hidden');
                  form.payoncashless.parentNode.classList.add('hidden');
                  form.comment.focus();
              }
            });
          }
          this.formatcash(form);
        }else confirm('Отправить отчёт сейсас?') ? form.sell.click() : console.log('Ничего');
      break;
      case 'no':
        if(!form.reasonCancellation) {
          form.querySelector('.finishDelivery').insertAdjacentHTML('afterbegin',
            `<label><input type="radio" name="reasonCancellation" value="noContact">Не удалось связаться с клиентом</label><br><br>
            <label><input type="radio" name="reasonCancellation" value="postponement" checked>Перенос доставки на другое время</label><br><br>
            <label><input type="radio" name="reasonCancellation" value="cancel_deal">Доставка отменена</label><br>`
          );

          for(let i=0, length=form.reasonCancellation.length; i<length; i++) {
            form.reasonCancellation[i].addEventListener('change', (event) => {
              if(event.target.value == 'cancel_deal' || event.target.value == 'postponement') form.querySelector('[name="comment"]').focus();
            });
          }
        }else confirm('Отправить отчёт сейсас?') ? form.sell.click() : console.log('Ничего');
      break;
      default:
        return console.log('Так не бывает!');
    }

    form.classList.remove('hidden');
  },

  formatcash: function(form) {
    form.payoncash.addEventListener('input', (e) => {
      let retstr = '',
          now = 0,
          val = e.target.value.replace(/\D/g,'');
      for(l=val.length-1; l>=0; l--) {
        if(now < 3) {
          now++;
          retstr = val.charAt(l) + retstr;
        }else{
          now = 1;
          retstr = val.charAt(l) + ' ' + retstr;
        }
      }
      e.target.value = retstr;
    });
    form.kopeek.addEventListener('focus', (e) => e.target.select());
    form.kopeek.addEventListener('input', (e) => e.target.value = ("0"+e.target.value).slice(-2));
  },

  /* - Отправка данных на портал */
  pushReport: function(form) {
    let formData = new FormData(form);
    formData.append('user_id', localStorage.getItem('user_id'));
    let sendReport = shell.getJsonQuest(formData);
    sendReport.then(
      (info) => {
        if(info == 'message') return alert('Заметка отправлена')
        else {
          document.getElementById(`dlv_${ formData.get('dlvr_id') }`).classList.add('hidden');
          return alert(info);
        }
      },
      (err) => console.log(`Ошибка последней отправки: ${ err }`)
    );
  }
}

const app = new Application();
