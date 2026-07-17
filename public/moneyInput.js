(function () {
  function onlyDigits(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function stripLeadingZeros(value) {
    return value.replace(/^0+(?=\d)/, '') || '0';
  }

  function formatDigitsAsMoney(digits) {
    const cleanDigits = onlyDigits(digits);
    const paddedDigits = cleanDigits.padStart(3, '0');
    const integerPart = stripLeadingZeros(paddedDigits.slice(0, -2));
    const centsPart = paddedDigits.slice(-2);
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    return `${formattedInteger},${centsPart}`;
  }

  function decimalToDigits(value) {
    const normalizedValue = String(value || '').trim();

    if (!normalizedValue) {
      return '';
    }

    if (normalizedValue.includes(',')) {
      const [integerPart, centsPart = ''] = normalizedValue.replace(/\./g, '').split(',');
      return `${onlyDigits(integerPart)}${onlyDigits(centsPart).padEnd(2, '0').slice(0, 2)}`;
    }

    if (normalizedValue.includes('.')) {
      const [integerPart, centsPart = ''] = normalizedValue.split('.');
      return `${onlyDigits(integerPart)}${onlyDigits(centsPart).padEnd(2, '0').slice(0, 2)}`;
    }

    return `${onlyDigits(normalizedValue)}00`;
  }

  function toDecimalString(input) {
    const paddedDigits = onlyDigits(input.value).padStart(3, '0');
    const integerPart = stripLeadingZeros(paddedDigits.slice(0, -2));
    const centsPart = paddedDigits.slice(-2);

    return `${integerPart}.${centsPart}`;
  }

  function attach(input) {
    function applyMask() {
      const digits = onlyDigits(input.value);
      input.value = digits ? formatDigitsAsMoney(digits) : '';
      input.setSelectionRange(input.value.length, input.value.length);
    }

    if (input.value) {
      input.value = formatDigitsAsMoney(decimalToDigits(input.value));
    }

    input.addEventListener('input', applyMask);
    input.addEventListener('focus', applyMask);
  }

  window.MoneyInput = {
    attach,
    toDecimalString,
    toNumber(input) {
      return Number(toDecimalString(input));
    }
  };
})();
