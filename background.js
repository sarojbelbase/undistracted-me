$(document).ready(function () {

    const update_interval = 1000;
    let year = moment().tz('Asia/Kathmandu').format('YYYY');
    let month = moment().tz('Asia/Kathmandu').format('M');
    let day = moment().tz('Asia/Kathmandu').format('D');

    function clock() {
        $('#live-time').html(moment().tz('Asia/Kathmandu').format('HH.mm.ss'));
    }

    function date() {
        $('#date-today').html(moment().tz('Asia/Kathmandu').format('MMMM D, dddd'));
    }

    function nepalimiti() {
        $('#nepalimiti').html(mitibar(year, month, day));
    }

    setInterval(clock, update_interval);
    setInterval(date, update_interval);
    setInterval(nepalimiti, update_interval);

});

