package kr.co.carrer.global.s3;

import org.springframework.context.annotation.Profile;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.nio.file.Path;
import java.nio.file.Paths;

@Profile("local")
@RestController
public class MockFileController {

    @GetMapping("/mock-files/{filename}")
    public ResponseEntity<Resource> serveFile(@PathVariable String filename) {
        Path path = Paths.get(System.getProperty("java.io.tmpdir"), "career-wave-mock-files", filename);
        Resource resource = new FileSystemResource(path);
        if (!resource.exists()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(resource);
    }
}
