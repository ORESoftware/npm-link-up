// realpath.c
#include <stdio.h>
#include <stdlib.h>

int main (int argc, char* argv[])
{
  if (argc > 1) {
    for (int argIter = 1; argIter < argc; ++argIter) {
      char *resolved_path_buffer = NULL;
      char *result = realpath(argv[argIter], resolved_path_buffer);

      puts(result);

      if (result != NULL) {
        free(result);
      }
    }
  }

  return 0;
}
