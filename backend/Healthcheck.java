import java.net.URI;
import java.net.http.*;
import java.time.Duration;
class Healthcheck {
 public static void main(String[] args) throws Exception {
  var response=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build().send(HttpRequest.newBuilder(URI.create(args[0])).timeout(Duration.ofSeconds(5)).GET().build(),HttpResponse.BodyHandlers.discarding());
  System.exit(response.statusCode()==200?0:1);
 }
}
