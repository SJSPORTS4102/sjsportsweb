// continuosly check if the fields are completed
document.addEventListener('crPickupActivated', function (e) { 
    console.log('____ activated _____');
  
    if (pickupChosen()) disableCheckoutButton2();
    var tt = setInterval(function(){
      if (pickupChosen()) disableCheckoutButton2();
      //console.log('check.............')
      var fieldsCorrect = checkPickupFields();
      //console.log({fieldsCorrect})
      if (fieldsCorrect === true) {
        //clearInterval(tt);  
      }
      
    }, 1000);
    //setTimeout(function() { clearInterval(tt); }, 5000);  

  jqCR('#pickup-date-start, #note-pickup-date, #pickup-first-name, #pickup-last-name, #pickup-number').on('mouseout keyup change', function(){
  	//console.log('check for others and activate checkout')  	
    checkPickupFields()
  })
  
  jqCR(document).on('change', '#pickup-selected-store', function(){checkPickupFields()})  
  trackChange(jqCR("#pickup-selected-store")[0] );  

   jqCR(document).on('change', '#note-pickup-date', function(){checkPickupFields()})  
   trackChange(jqCR("#note-pickup-date")[0] );
});


MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

var trackChange = function(element) {
  var observer = new MutationObserver(function(mutations, observer) {
    if(mutations[0].attributeName == "value") {
        jqCR(element).trigger("change");
    }
  });
  observer.observe(element, {
    attributes: true
  });
}

/* Off Leesh 25 Nov 2026: only hold Checkout while Pickup In Store is the chosen option. Before this, once a
   shopper clicked Pickup the timer above kept disabling Checkout every second, even after they went back to Shipping. */
function pickupChosen(){
  return !!document.querySelector('.js-toggle-pickup.selected, .pickup-button.selected');
}

function checkPickupFields(){
    if (!pickupChosen()) { activateCheckoutButton2(); return true; }
  	var pickupDate = jqCR('#pickup-date-start').val();
    var firstName = jqCR('#pickup-first-name').val();
    var lastName = jqCR('#pickup-last-name').val();
    var phone = jqCR('#pickup-number').val();
    var selectedStoreId = jqCR('#pickup-selected-store-id').val()
    if (pickupDate) {
      activateCheckoutButton2();
      return true;
    }
    disableCheckoutButton2()
    return false;
}

function activateCheckoutButton2(){
  //console.log('Activate')
      var ck = document.querySelector('#checkout'); if (ck) ck.disabled = false;
  }

function disableCheckoutButton2(){    
    var ck = document.querySelector('#checkout'); if (ck) ck.disabled = true;
}