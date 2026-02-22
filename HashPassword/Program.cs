using System;

var password = "ShanbouraCodeNetOwner1992003#";
var hash = BCrypt.Net.BCrypt.HashPassword(password);
Console.WriteLine(hash);
