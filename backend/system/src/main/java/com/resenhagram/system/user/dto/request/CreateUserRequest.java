package com.resenhagram.system.user.dto.request;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateUserRequest (
    @NotBlank(message = "O username é obrigatório")
    @Size(min = 3, max =  50, message = "O username deve ter entre 3 e 50 caracteres")
    String username,

    @NotBlank(message = "O nome de exibição é obrigatório")
    @Size(max = 100, message = "O nome de exibição deve ter no máximo 100 caracteres")
    String displayName,

    @NotBlank(message = "A senha é obrigatória")
    @Size(min = 6, max = 100, message = "A senha deve ter entre 6 e 100 caracteres")
    String password
){
    
}
