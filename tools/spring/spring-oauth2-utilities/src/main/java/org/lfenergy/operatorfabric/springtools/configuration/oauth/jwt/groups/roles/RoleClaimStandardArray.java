package org.lfenergy.operatorfabric.springtools.configuration.oauth.jwt.groups.roles;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

/**
 * Define the structure of the RoleClaimStandardArray, the common use case which dealts the case of an array value.
 * @author chengyli
 *
 */
@Data
@NoArgsConstructor
@EqualsAndHashCode(callSuper=true)
public class RoleClaimStandardArray extends RoleClaimStandard {
	
	public RoleClaimStandardArray(String path) {
		super(path);
	}

	/**
	 * Get each element of the JSON array as a role
	 */	
	@Override
	public List<String> computeNodeElementRole(JsonNode jsonNodeElement) {
		List<String> listGroupsResult = new ArrayList<>();
		if (jsonNodeElement.isArray()) {
			for (final JsonNode roleElement : jsonNodeElement) {
				listGroupsResult.add(roleElement.asText());	
		    }
		} 		
		return listGroupsResult;
	}
	
	@Override
	public String toString() {
		StringBuilder sb = new StringBuilder();
		sb.append("RoleClaimStandardArray(path="+path+")");
		return sb.toString();
	}

	
}