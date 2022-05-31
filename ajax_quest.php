<?php
  require_once ('backscripts/crest.php');

  if( isset($_POST) )
  {
    switch ( $_POST['formname'] ) {

      /* Авторизация */
      case 'autorisation':
        include 'backscripts/autorisation.php';
      break;

      /* Переключение вкладок */
      case 'switchtab':
        include 'backscripts/switchtab.php';
      break;
      
      /* Отправка отчёта */
      case 'sendareport':
        include 'backscripts/sendareport.php';
      break;

      default:
        print_r("Такой формы на странице не обнаружено");
      break;
    }

  }
  